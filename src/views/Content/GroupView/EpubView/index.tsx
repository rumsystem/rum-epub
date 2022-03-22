import React from 'react';
import classNames from 'classnames';
import { action, observable, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import Epub, { Book, Contents, Location, NavItem } from 'epubjs';
import Section from 'epubjs/types/section';
import { Annotation } from 'epubjs/types/annotations';
import { PackagingMetadataObject } from 'epubjs/types/packaging';
import { Button, CircularProgress, ClickAwayListener, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import FullscreenIcon from 'boxicons/svg/regular/bx-fullscreen.svg?react';
import EditAltIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill';

import { nodeService } from '~/service/node';
import { EpubBook, epubService } from '~/service/epub';
import { linkTheme, progressBarTheme, readerSettingsService, readerThemes } from '~/service/readerSettings';
import { ReadingProgressItem } from '~/service/db';
import { addLinkOpen } from '~/utils';

import BookImage from '~/assets/illustration_book.svg';
import ArrowImage from '~/assets/arrow.svg';

import { EpubAllHighlightButton } from './EpubAllHighlightButton';
import { EpubChaptersButton } from './EpubChaptersButton';
import { EpubHeader } from './EpubHeader';
import { EpubSelectBookButton } from './EpubSelectBookButton';
import { EpubSettings } from './EpubSettings';
import { highLightRange } from './helper';
import { BookCoverImgTooltip } from '~/components/BookCoverImgTooltip';

interface Props {
  className?: string
}

export const EpubView = observer((props: Props) => {
  const state = useLocalObservable(() => observable({
    bookItem: null as null | EpubBook,
    book: null as null | Book,
    bookTrxId: '',
    bookMetadata: null as null | PackagingMetadataObject,
    chapters: [] as Array<NavItem>,

    currentHref: '',
    spread: false,
    atEnd: true,
    atStart: true,
    // selectedCfiRange: '',
    spineLoaded: false,
    highlightButton: null as null | { range: string, top: number, left: number },
    mousePosition: { x: 0, y: 0 },

    fullScreen: false,
    loadingFirstBook: true,
    renderBox: React.createRef<HTMLDivElement>(),

    jumpingHistory: [] as Array<string>,
    get chapterProgress() {
      if (!this.currentHref || !state.spineLoaded) {
        return [0, 0, 0];
      }
      const items: Array<any> = (state.book?.spine as any)?.items ?? [];
      const total = items.length;
      const current = items.findIndex((v) => v.href.replace(/#.*/, '') === this.currentHref.replace(/#.*/, '')) + 1;
      return [current / total, current, total];
    },
    get currentSpineItem() {
      if (!state.spineLoaded || !state.currentHref) {
        return null;
      }
      const items: Array<any> = (state.book as any)?.spine?.items ?? [];
      if (!items.length) {
        return null;
      }
      const item = items.find((v) => v.href === state.currentHref) ?? null;
      return item;
    },
    get currentUploadItem() {
      return epubService.state.uploadMap.get(nodeService.state.activeGroupId) ?? null;
    },
    get readerTheme() {
      return readerThemes[readerSettingsService.state.theme];
    },
  }));

  const handlePrev = () => {
    if (state.atStart) {
      return;
    }
    state.book?.rendition?.prev?.();
  };

  const handleNext = () => {
    if (state.atEnd) {
      return;
    }
    state.book?.rendition?.next?.();
  };

  const handleChangeChapter = (type: 'prev' | 'next') => {
    const item = type === 'prev'
      ? state.currentSpineItem?.prev()
      : state.currentSpineItem?.next();
    if (!item) {
      return;
    }
    state.book?.rendition.display(item.href);
  };

  const handleJumpToHref = (href: string) => {
    state.book?.rendition?.display(href);
  };

  const handleBackJumpingHistory = () => {
    const item = state.jumpingHistory.pop();
    if (!item) {
      return;
    }
    state.book?.rendition.display(item);
  };

  const handleToggleFullScreen = action(() => {
    state.fullScreen = !state.fullScreen;
  });

  const handleResize = () => {
    const isRenditionReady = !!(state.book?.rendition as any)?.manager;
    if (!isRenditionReady || !state.renderBox.current) {
      return;
    }
    const rect = state.renderBox.current.getBoundingClientRect();
    state.book!.rendition.resize(rect.width, rect.height);
  };

  const loadBook = (bookItem: EpubBook, readingProgress?: ReadingProgressItem | null) => {
    state.book?.destroy();
    runInAction(() => {
      state.chapters = [];
      state.bookTrxId = '';
      state.bookMetadata = null;
      state.spineLoaded = false;
      state.atEnd = false;
      state.atStart = false;
      state.currentHref = '';
    });
    const buffer = bookItem.file;
    const book = Epub(buffer.buffer);
    runInAction(() => {
      state.bookItem = bookItem;
      state.book = book;
      state.bookTrxId = bookItem.trxId;
    });
    book.loaded.metadata.then(action((v) => {
      state.bookMetadata = { ...v };
    }));
    book.loaded.spine.then(action(() => {
      state.spineLoaded = true;
    }));
    (window as any).book = book;
    const rendition = book.renderTo(state.renderBox.current!, {
      width: '100%',
      height: '100%',
      // flow: 'scrolled-doc',
      ignoreClass: 'rum-annotation-hl',
      // spread: 'none',
      minSpreadWidth: 950,
    });

    Promise.resolve(readingProgress || epubService.getReadingProgress(
      nodeService.state.activeGroupId,
      bookItem.trxId,
    )).then((p) => {
      rendition.display(p?.readingProgress ?? undefined);
    });

    epubService.getHighlights(
      nodeService.state.activeGroupId,
      bookItem.trxId,
    ).then((highlights) => {
      highlights.forEach((v) => {
        highLightRange({
          book,
          bookTrx: state.bookTrxId,
          cfiRange: v.cfiRange,
          groupId: nodeService.state.activeGroupId,
        });
      });
    });

    book.loaded.navigation.then(action((navigation) => {
      state.chapters = navigation.toc;
    }));

    rendition.on('layout', action((layout: any) => {
      state.spread = layout.width >= 950;
    }));

    rendition.on('relocated', action((location: Location) => {
      epubService.saveReadingProgress(
        nodeService.state.activeGroupId,
        bookItem.trxId,
        location.start.cfi,
      );
      state.atEnd = location.atEnd;
      state.atStart = location.atStart;
    }));

    rendition.on('rendered', action((section: Section) => {
      state.currentHref = section.href;
      const iframe: HTMLIFrameElement = (book as any).rendition?.manager?.views?._views?.[0]?.iframe;
      if (iframe?.contentWindow) {
        addLinkOpen(iframe.contentWindow);
        iframe.contentWindow.addEventListener('keydown', (e) => {
          const evt = new CustomEvent('keydown', { bubbles: true, cancelable: false }) as any;
          evt.key = e.key;
          evt.ctrlKey = e.ctrlKey;
          iframe.dispatchEvent(evt);
        });
        iframe.contentWindow.addEventListener('mousemove', (event) => {
          const boundingClientRect = iframe.getBoundingClientRect();
          const evt = new CustomEvent('mousemove', { bubbles: true, cancelable: false }) as any;
          evt.clientX = event.clientX + boundingClientRect.left;
          evt.clientY = event.clientY + boundingClientRect.top;
          iframe.dispatchEvent(evt);
        });
      }
    }));

    rendition.hooks.content.register((contents: Contents) => {
      contents.on('linkClicked', (href: string) => {
        const relative = book.path.relative(href);
        state.jumpingHistory.push(rendition.location.start.cfi);
        rendition.display(relative);
      });
    });
    rendition.hooks.content.register(() => {
      readerSettingsService.injectCSS(rendition);

      rendition.views().forEach((v: any) => {
        const document = v.document as Document;
        document.addEventListener('selectionchange', () => {
          const selection = document.getSelection()?.toString();
          if (!selection) {
            runInAction(() => {
              state.highlightButton = null;
            });
          }
        });
      });
    });

    rendition.on('selected', action((cfiRange: string, _contents: Contents) => {
      state.highlightButton = {
        range: cfiRange,
        left: state.mousePosition.x,
        top: state.mousePosition.y,
      };
    }));

    rendition.once('displayed', () => {
    });
  };

  const handleLoadRecentUpload = () => {
    const book = state.currentUploadItem?.recentUploadBook;
    if (book) {
      loadBook(book);
    }
  };

  const handleAddHighlight = () => {
    if (!state.highlightButton || !state.book) {
      return;
    }
    const annotations: Array<Annotation> = Object.values((state.book.rendition.annotations as any)._annotations);
    if (annotations.some((v) => v.cfiRange === state.highlightButton!.range)) {
      return;
    }

    highLightRange({
      groupId: nodeService.state.activeGroupId,
      bookTrx: state.bookTrxId,
      cfiRange: state.highlightButton.range,
      book: state.book,
    });

    const iframe: HTMLIFrameElement = (state.book as any).rendition?.manager?.views?._views?.[0]?.iframe;
    if (iframe) {
      iframe.contentWindow?.getSelection()?.removeAllRanges();
    }
  };

  React.useEffect(() => {
    const loadFirstBook = async () => {
      await epubService.parseAllTrx(nodeService.state.activeGroupId);

      const books = epubService.state.bookMap.get(nodeService.state.activeGroupId);

      const progress = await epubService.getReadingProgress(
        nodeService.state.activeGroupId,
      );
      const book = books?.find((v) => v.trxId === progress?.bookTrx) ?? books?.at(0);
      if (book) {
        loadBook(book, progress);
      }
    };

    loadFirstBook().then(action(() => {
      state.loadingFirstBook = false;
    }));

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.fullScreen) {
        handleToggleFullScreen();
      }
      if (e.key === 'f' && e.ctrlKey && !state.fullScreen) {
        handleToggleFullScreen();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      state.mousePosition.x = e.clientX;
      state.mousePosition.y = e.clientY;
    };

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousemove', handleMouseMove);

    const ro = new ResizeObserver(handleResize);
    ro.observe(state.renderBox.current!);

    return () => {
      state.book?.destroy();
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('mousemove', handleMouseMove);
      ro.disconnect();
    };
  }, []);

  const noBook = !state.currentUploadItem?.uploading && !state.currentUploadItem?.recentUploadBook;
  const uploading = !!state.currentUploadItem?.uploading;
  const uploadDone = !state.currentUploadItem?.uploading && !!state.currentUploadItem?.recentUploadBook;

  const lightTheme = ['white', 'light'].includes(readerSettingsService.state.theme);
  const darkTheme = ['dark', 'black'].includes(readerSettingsService.state.theme);

  return (
    <div className={classNames('flex-col', props.className)}>
      <EpubHeader />

      <div
        className={classNames(
          'flex flex-col flex-1 bg-white',
          !state.fullScreen && 'h-0',
          state.fullScreen && 'fixed inset-0 z-50',
        )}
      >
        <div className="flex justify-between items-center flex-none gap-x-4 border-b px-6 h-[62px]">
          <EpubSelectBookButton
            onSelect={(v) => loadBook(v)}
            currentBookTrxId={state.bookTrxId}
          />
          <BookCoverImgTooltip
            book={state.bookItem}
            placement="bottom"
          >
            <div className="text-18 truncate">
              <span className="text-gray-33">
                {state.bookMetadata?.title}
              </span>
              {!!state.bookMetadata?.creator && (
                <span className="text-gray-9c">
                  &nbsp;-&nbsp;
                  {state.bookMetadata?.creator}
                </span>
              )}
            </div>
          </BookCoverImgTooltip>
          {/* <Tooltip title={`${state.bookMetadata?.title}${state.bookMetadata?.creator ? ` - ${state.bookMetadata?.creator}` : ''}`}>
          </Tooltip> */}

          <div className="flex items-center gap-x-3">
            <EpubChaptersButton
              className="p-2"
              chapters={state.chapters}
              current={state.currentHref}
              onChapterClick={handleJumpToHref}
            />
            <EpubAllHighlightButton
              book={state.book}
            />
            <EpubSettings
              className="p-2"
              book={state.book}
              bookTrx={state.bookTrxId}
            />
            <Tooltip title="切换全屏">
              <div
                className="p-2 cursor-pointer"
                onClick={handleToggleFullScreen}
              >
                <FullscreenIcon />
              </div>
            </Tooltip>
          </div>
        </div>

        {state.loadingFirstBook && (
          <div
            className="flex flex-1 flex-center"
            style={{ background: state.readerTheme.body.background }}
          >
            <CircularProgress className="text-gray-ec" />
          </div>
        )}

        {!state.book && !state.loadingFirstBook && (
          <div className="flex flex-col items-center gap-y-12 p-12 select-none relative overflow-hidden flex-1 h-0">
            {(uploading || uploadDone) && (
              <img
                className="absolute top-4 left-16"
                src={ArrowImage}
                alt=""
              />
            )}

            <div
              className={classNames(
                'relative flex-col select-none p-6 gap-y-2 z-10',
                'text-gray-4a text-20 font-bold text-center',
                'outline outline-2 w-[500px] outline-dashed outline-gray-c4 outline-offset-4',
              )}
            >
              {noBook && (<>
                <p>种子网络还没有书籍</p>
                <p>点击上方的上传书籍按钮上传第一本书</p>
              </>)}

              {uploading && (<>
                <p>书籍正在上传中……</p>
                <p>上传完毕后，你可以在这里选择书籍开始阅读</p>
              </>)}

              {uploadDone && (<>
                <p>书籍已成功上传</p>
                <p>{state.currentUploadItem?.recentUploadBook?.title}</p>
              </>)}
            </div>

            {uploadDone && (
              <Button
                className="rounded-full text-20 px-12"
                onClick={handleLoadRecentUpload}
              >
                开始阅读
              </Button>
            )}

            <div className="flex-col flex-center flex-1 h-0 self-stretch">
              <img className="flex-1 h-0 max-h-[550px]" src={BookImage} alt="" />
            </div>
          </div>
        )}

        <div
          className={classNames(
            'flex flex-col flex-1 items-stretch h-0 select-none',
            !state.book && 'hidden',
          )}
          style={{ background: state.readerTheme.body.background }}
        >
          <div className="flex flex-1 justify-between items-stretch h-0 relative">
            {state.spread && (
              <div className="flex flex-col absolute left-1/2 top-0 bottom-0 w-px py-12 z-10">
                <div
                  className={classNames(
                    lightTheme && 'bg-gray-de flex-1',
                    darkTheme && 'bg-gray-88 flex-1',
                  )}
                />
              </div>
            )}

            <div
              className="flex flex-center w-16 cursor-pointer group"
              onClick={handlePrev}
            >
              <ChevronLeft
                className={classNames(
                  'text-36',
                  lightTheme && 'text-gray-9c',
                  darkTheme && 'text-gray-6f',
                  !state.atStart && lightTheme && 'group-hover:text-gray-33',
                  !state.atStart && darkTheme && 'group-hover:text-gray-af',
                )}
              />
            </div>
            <div
              className="flex flex-1 w-0 h-full max-w-[1750px]"
              ref={state.renderBox}
            />
            <div
              className="flex flex-center w-16 cursor-pointer group"
              onClick={handleNext}
            >
              <ChevronRight
                className={classNames(
                  'text-36',
                  lightTheme && 'text-gray-9c',
                  darkTheme && 'text-gray-6f',
                  !state.atStart && lightTheme && 'group-hover:text-gray-33',
                  !state.atStart && darkTheme && 'group-hover:text-gray-af',
                )}
              />
            </div>
          </div>

          <div className="flex flex-none justify-between items-stretch gap-x-4 px-16 h-16">
            <div
              className="flex flex-none flex-center cursor-pointer group px-4 select-none"
              style={{
                color: state.currentSpineItem?.prev()
                  ? linkTheme[readerSettingsService.state.theme].enabled
                  : linkTheme[readerSettingsService.state.theme].disabled,
              }}
              onClick={() => handleChangeChapter('prev')}
            >
              上一章
            </div>
            {!!state.jumpingHistory.length && (
              <div
                className="flex flex-none flex-center cursor-pointer group px-4 text-producer-blue select-none"
                onClick={handleBackJumpingHistory}
              >
                返回跳转前位置
              </div>
            )}
            <Tooltip title={`${state.chapterProgress[1] + 1} / ${state.chapterProgress[2]}`}>
              <div className="py-5 w-full self-center mx-4">
                <div
                  className="flex items-stretch h-1 w-full bg-gray-de"
                  style={progressBarTheme[readerSettingsService.state.theme].track}
                >
                  <div
                    className="flex-none bg-gray-4a"
                    style={{
                      ...progressBarTheme[readerSettingsService.state.theme].progress,
                      width: `${(state.chapterProgress[0] * 100).toFixed(2)}%`,
                    }}
                  />
                </div>
              </div>
            </Tooltip>
            <div
              className="flex flex-none flex-center cursor-pointer group px-4 select-none"
              style={{
                color: state.currentSpineItem?.next()
                  ? linkTheme[readerSettingsService.state.theme].enabled
                  : linkTheme[readerSettingsService.state.theme].disabled,
              }}
              onClick={() => handleChangeChapter('next')}
            >
              下一章
            </div>
          </div>
        </div>

        <ClickAwayListener onClickAway={action(() => { state.highlightButton = null; })}>
          <div
            className={classNames(
              'fixed bg-white rounded shadow-4 p-[6px] cursor-pointer',
              !state.highlightButton && 'hidden',
            )}
            style={{
              left: `${state.highlightButton?.left ?? 0}px`,
              top: `${state.highlightButton?.top ?? 0}px`,
            }}
            onClick={handleAddHighlight}
          >
            <EditAltIcon className="text-producer-blue" />
          </div>
        </ClickAwayListener>
      </div>
    </div>
  );
});
