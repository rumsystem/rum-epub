import { posix } from 'path';
import React from 'react';
import classNames from 'classnames';
import { action, observable, reaction, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import Epub, { Book, Contents, Location, NavItem } from 'epubjs';
import { isNone } from 'fp-ts/lib/Option';
import Section from 'epubjs/types/section';
import { Annotation } from 'epubjs/types/annotations';
import { PackagingMetadataObject } from 'epubjs/types/packaging';
import { Button, CircularProgress, ClickAwayListener, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import FullscreenIcon from 'boxicons/svg/regular/bx-fullscreen.svg?fill-icon';
import ExitFullscreenIcon from 'boxicons/svg/regular/bx-exit-fullscreen.svg?fill-icon';
import EditAltIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill';

import {
  nodeService,
  EpubItem,
  epubService,
  linkTheme,
  progressBarTheme,
  readerSettingsService,
  readerThemes,
  ReadingProgressItem,
} from '~/service';
import { addLinkOpen, modifierKeys } from '~/utils';
import { BookCoverImgTooltip } from '~/components';

import BookImage from '~/assets/illustration_book.svg';
import ArrowImage from '~/assets/arrow.svg';

import { EpubShortCutPopover } from './EpubShortCutPopover';
import { EpubAllHighlightButton } from './EpubAllHighlightButton';
import { EpubChaptersButton } from './EpubChaptersButton';
import { EpubHeader } from './EpubHeader';
import { EpubSelectBookButton } from './EpubSelectBookButton';
import { EpubSettings } from './EpubSettings';
import { highLightRange } from './helper';

interface Props {
  className?: string
}

export const EpubView = observer((props: Props) => {
  const state = useLocalObservable(() => observable({
    bookItem: null as null | EpubItem,
    book: null as null | Book,

    // book states
    bookTrxId: '',
    bookMetadata: null as null | PackagingMetadataObject,
    chapters: [] as Array<NavItem>,
    jumpingHistory: [] as Array<string>,
    currentHref: '',
    spread: false,
    atEnd: true,
    atStart: true,
    spineLoaded: false,

    // other states
    highlightButton: null as null | { range: string, top: number, left: number },
    mousePosition: { x: 0, y: 0 },
    fullScreen: false,
    loadingFirstBook: true,
    renderBox: React.createRef<HTMLDivElement>(),
    get chapterProgress() {
      if (!this.currentHref || !state.spineLoaded) {
        return [0, 0, 0];
      }
      const items: Array<any> = (state.book?.spine as any)?.items ?? [];
      const total = items.length;
      const current = items.findIndex((v) => v.href.replace(/#.*/, '') === this.currentHref.replace(/#.*/, '')) + 1;
      return [current / total, current, total];
    },
    get groupItem() {
      return epubService.getGroupItem(nodeService.state.activeGroupId);
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
      return this.groupItem.upload.epub;
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

  const handleJumpToChapter = action((href: string) => {
    const book = state.book;
    if (!book) { return; }
    const cfi = book.rendition?.location?.start.cfi;
    if (cfi) {
      state.jumpingHistory.push(cfi);
    }
    book.rendition?.display(href);
  });

  const handleBackJumpingHistory = action(() => {
    const item = state.jumpingHistory.pop();
    if (!item) {
      return;
    }
    state.book?.rendition.display(item);
  });

  const handleToggleFullScreen = action(() => {
    state.fullScreen = !state.fullScreen;
  });

  const handleResize = () => {
    const isRenditionReady = !!(state.book?.rendition as any)?.manager;
    if (!isRenditionReady || !state.renderBox.current) {
      return;
    }
    const rect = state.renderBox.current.getBoundingClientRect();
    try {
      state.book!.rendition.resize(rect.width, rect.height);
    } catch (e) {}
  };

  const unloadBook = action(() => {
    state.book?.destroy();
    state.bookTrxId = '';
    state.bookMetadata = null;
    state.chapters = [];
    state.jumpingHistory = [];
    state.currentHref = '';
    state.spread = false;
    state.atEnd = false;
    state.atStart = false;
    state.spineLoaded = false;

    state.book = null;
    state.bookItem = null;
  });

  const loadBook = async (bookItem: EpubItem, readingProgress?: ReadingProgressItem | null) => {
    const groupId = nodeService.state.activeGroupId;
    unloadBook();
    const renderBox = state.renderBox.current;
    if (!renderBox) { return; }
    const buffer = await epubService.getBookBuffer(groupId, bookItem.trxId);
    if (isNone(buffer)) {
      console.error(new Error(`try load book ${bookItem.trxId} in group ${groupId} which doesn't exist`));
      return;
    }
    const book = Epub(buffer.value.buffer);
    runInAction(() => {
      state.bookItem = bookItem;
      state.book = book;
      state.bookTrxId = bookItem.trxId;
      state.loadingFirstBook = false;
    });
    book.loaded.metadata.then(action((v) => {
      state.bookMetadata = { ...v };
    }));
    book.loaded.spine.then(action(() => {
      state.spineLoaded = true;
    }));
    (window as any).book = book;
    const rendition = book.renderTo(renderBox, {
      width: '100%',
      height: '100%',
      // flow: 'scrolled-doc',
      ignoreClass: 'rum-annotation-hl',
      // spread: 'none',
      minSpreadWidth: 950,
    });

    Promise.resolve(readingProgress || epubService.getReadingProgress(
      groupId,
      bookItem.trxId,
    )).then((p) => {
      rendition.display(p?.readingProgress ?? undefined);
    });

    epubService.getHighlights(
      groupId,
      bookItem.trxId,
    ).then((highlights) => {
      highlights.forEach((v) => {
        highLightRange({
          book,
          bookTrx: state.bookTrxId,
          cfiRange: v.cfiRange,
          groupId,
        });
      });
    });

    book.loaded.navigation.then(action((navigation) => {
      const navPath = book.packaging.navPath || book.packaging.ncxPath;
      const mapNavItems = (toc: Array<NavItem>) => {
        const arr = toc.map((v) => {
          const item = { ...v };
          // get chapter path relative to navPath for navigation
          // https://github.com/futurepress/epub.js/issues/1084#issuecomment-647002309
          const correctHref = posix.join(navPath, '..', item.href);
          item.href = correctHref;
          if (item.subitems && item.subitems.length) {
            item.subitems = mapNavItems(item.subitems);
          }
          return item;
        });
        return arr;
      };
      state.chapters = mapNavItems(navigation.toc);
    }));

    rendition.on('layout', action((layout: any) => {
      state.spread = layout.width >= 950;
    }));

    rendition.on('relocated', action((location: Location) => {
      epubService.saveReadingProgress(
        groupId,
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
          evt.altKey = e.altKey;
          evt.code = e.code;
          evt.ctrlKey = e.ctrlKey;
          evt.isComposing = e.isComposing;
          evt.key = e.key;
          evt.location = e.location;
          evt.metaKey = e.metaKey;
          evt.repeat = e.repeat;
          evt.shiftKey = e.shiftKey;
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
      contents.on('linkClicked', action((href: string) => {
        const relative = book.path.relative(href);
        state.jumpingHistory.push(rendition.location.start.cfi);
        rendition.display(relative);
      }));
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
  };

  const handleLoadRecentUpload = () => {
    const book = state.currentUploadItem?.recentUploadBook;
    epubService.upload.resetEpub(nodeService.state.activeGroupId);
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
    const groupId = nodeService.state.activeGroupId;
    const loadFirstBook = async () => {
      const readingProgress = await epubService.getReadingProgress(
        groupId,
      );
      const loadBookFromReadingProgress = async () => {
        await epubService.tryLoadBookFromDB(groupId);
        const books = state.groupItem.books;
        const book = books?.find((v) => v.trxId === readingProgress?.bookTrx) ?? books?.at(0);
        if (book) {
          loadBook(book, readingProgress);
        }
      };

      Promise.all([
        loadBookFromReadingProgress(),
        epubService.parseNewTrx(groupId),
      ]).then(() => {
        if (state.book) {
          return;
        }
        const books = state.groupItem.books;
        const book = books?.find((v) => v.trxId === readingProgress?.bookTrx) ?? books?.at(0);
        if (book) {
          loadBook(book, readingProgress);
        }
      }).finally(() => {
        runInAction(() => {
          state.loadingFirstBook = false;
        });
      });
    };

    const watchGroupSyncDispose = reaction(
      () => nodeService.state.groupMap[groupId]?.highest_height,
      async () => {
        await epubService.parseNewTrx(groupId);
        if (!state.book && !state.currentUploadItem) {
          const epub = state.groupItem.books.at(0);
          if (epub) {
            loadBook(epub);
          }
        }
      },
    );

    loadFirstBook();

    const handleKeydown = (e: KeyboardEvent) => {
      const targetTagName = (e.target as HTMLElement)?.tagName.toLowerCase();
      if (['textarea', 'input'].includes(targetTagName)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'escape' && modifierKeys(e) && state.fullScreen) {
        handleToggleFullScreen();
      }
      if (key === 'f' && modifierKeys(e) && !state.fullScreen) {
        handleToggleFullScreen();
      }
      if (['arrowleft', 'pageup'].includes(key) && modifierKeys(e)) {
        handlePrev();
      }
      if ([' ', 'enter', 'arrowright', 'pagedown'].includes(key) && modifierKeys(e)) {
        handleNext();
      }
      if (key === 'arrowup' && modifierKeys(e)) {
        handleChangeChapter('prev');
      }
      if (key === 'arrowdown' && modifierKeys(e)) {
        handleChangeChapter('next');
      }
      if (key === 'b' && modifierKeys(e, ['shift'])) {
        handleBackJumpingHistory();
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

    const dispose = reaction(
      () => state.bookItem,
      action(() => {
        epubService.state.currentBookItem = state.bookItem;
      }),
      { fireImmediately: true },
    );

    return () => {
      try {
        state.book?.destroy();
      } catch (e) {
        console.error(e);
      }
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('mousemove', handleMouseMove);
      ro.disconnect();
      dispose();
      watchGroupSyncDispose();
    };
  }, []);

  const isOwner = nodeService.state.activeGroup?.user_pubkey === nodeService.state.activeGroup?.owner_pubkey;
  const noBook = !state.currentUploadItem?.uploading && !state.currentUploadItem?.recentUploadBook;
  const uploading = !!state.currentUploadItem?.uploading;
  const uploadDone = !state.currentUploadItem?.uploading && !!state.currentUploadItem?.recentUploadBook;

  const lightTheme = ['white', 'light'].includes(readerSettingsService.state.theme);
  const darkTheme = ['dark', 'black'].includes(readerSettingsService.state.theme);

  return (
    <div className={classNames('flex-col', props.className)}>
      <EpubHeader book={state.bookItem} />

      <div
        className={classNames(
          'flex flex-col flex-1 bg-white',
          !state.fullScreen && 'h-0',
          state.fullScreen && 'fixed inset-0 z-50',
        )}
      >
        <div
          className={classNames(
            'flex justify-between items-center flex-none gap-x-4 px-6 h-[40px]',
            readerSettingsService.state.dark && 'bg-gray-2c',
          )}
        >
          <EpubSelectBookButton
            onSelect={(v) => loadBook(v)}
            currentBookTrxId={state.bookTrxId}
          />
          <BookCoverImgTooltip
            groupId={nodeService.state.activeGroupId}
            bookTrx={state.bookItem?.trxId ?? ''}
            placement="bottom"
          >
            <div className="text-18 truncate">
              <span
                className={classNames(
                  !readerSettingsService.state.dark && 'text-gray-33',
                  readerSettingsService.state.dark && 'text-gray-f7',
                )}
              >
                {state.bookMetadata?.title}
              </span>
              {!!state.bookMetadata?.creator && (
                <span className="text-gray-9c">
                  &nbsp;-&nbsp;
                  <span className="text-14">
                    {state.bookMetadata?.creator}
                  </span>
                </span>
              )}
            </div>
          </BookCoverImgTooltip>

          <div className="flex items-center gap-x-1">
            <EpubChaptersButton
              className="px-2"
              chapters={state.chapters}
              current={state.currentHref}
              onChapterClick={handleJumpToChapter}
            />
            <EpubAllHighlightButton
              className="px-2"
              book={state.book}
            />
            <EpubSettings
              className="px-2"
              book={state.book}
              bookTrx={state.bookTrxId}
            />
            <EpubShortCutPopover className="px-2" />
            <Tooltip title="切换全屏">
              <div
                className="px-2 flex flex-center cursor-pointer"
                onClick={handleToggleFullScreen}
              >
                <ExitFullscreenIcon
                  className={classNames(
                    'text-22',
                    !state.fullScreen && 'hidden',
                    !readerSettingsService.state.dark && 'text-black',
                    readerSettingsService.state.dark && 'text-gray-af',
                  )}
                />
                <FullscreenIcon
                  className={classNames(
                    'text-22',
                    state.fullScreen && 'hidden',
                    !readerSettingsService.state.dark && 'text-black',
                    readerSettingsService.state.dark && 'text-gray-af',
                  )}
                />
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
              {isOwner && noBook && (<>
                <p>种子网络还没有书籍</p>
                <p>点击上方的上传书籍按钮上传第一本书</p>
              </>)}

              {!isOwner && noBook && (<>
                <p>种子网络还没有书籍</p>
                <p>等待种子网络上传/同步第一本书</p>
              </>)}

              {uploading && (<>
                <p>书籍正在上传中……</p>
                <p>上传完毕后，你可以在这里选择书籍开始阅读</p>
              </>)}

              {uploadDone && (<>
                <p>书籍已成功上传</p>
                <p>{state.currentUploadItem?.recentUploadBook?.fileInfo.title}</p>
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
              <img className="flex-1 h-0 max-h-[350px]" src={BookImage} alt="" />
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
