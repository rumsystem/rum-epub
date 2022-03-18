import React from 'react';
import classNames from 'classnames';
import { action, observable, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import Epub, { Book, Contents, Location, NavItem } from 'epubjs';
import Section from 'epubjs/types/section';
import { Annotation } from 'epubjs/types/annotations';
import { PackagingMetadataObject } from 'epubjs/types/packaging';
import { ClickAwayListener, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import FullscreenIcon from 'boxicons/svg/regular/bx-fullscreen.svg?react';
import EditAltIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill';

import { nodeService } from '~/service/node';
import { EpubBook, epubService } from '~/service/epub';
import { progressBarTheme, readerSettingsService, readerThemes } from '~/service/readerSettings';

import { EpubAllHighlightButton } from './EpubAllHighlightButton';
import { EpubChaptersButton } from './EpubChaptersButton';
import { EpubHeader } from './EpubHeader';
import { EpubSelectBook } from './EpubSelectBook';
import { EpubSettings } from './EpubSettings';
import { highLightRange } from './helper';

interface Props {
  className?: string
}

export const EpubView = observer((props: Props) => {
  const state = useLocalObservable(() => observable({
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

    ro: null as null | ResizeObserver,
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
  }, {}, { deep: false }));

  const epubReaderBox = React.useRef<HTMLDivElement>(null);

  const handleResize = () => {
    const isRenditionReady = !!(state.book?.rendition as any)?.manager;
    if (!isRenditionReady || !state.renderBox.current) {
      return;
    }
    const rect = state.renderBox.current.getBoundingClientRect();
    state.book!.rendition.resize(rect.width, rect.height);
  };

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

  const handleToggleFullScreen = action(() => {
    state.fullScreen = !state.fullScreen;
  });

  const loadBook = (bookItem: EpubBook) => {
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
    epubService.getReadingProgress(
      nodeService.state.activeGroupId,
      bookItem.trxId,
    ).then((progress) => {
      rendition.display(progress ?? undefined);
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
      iframe.contentWindow!.addEventListener('mousemove', (event) => {
        const boundingClientRect = iframe.getBoundingClientRect();
        const evt = new CustomEvent('mousemove', { bubbles: true, cancelable: false }) as any;
        evt.clientX = event.clientX + boundingClientRect.left;
        evt.clientY = event.clientY + boundingClientRect.top;
        iframe.dispatchEvent(evt);
      });
    }));

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

    const ro = new ResizeObserver(handleResize);
    ro.observe(state.renderBox.current!);
    state.ro = ro;
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

  const destroy = () => {
    state.book?.destroy();
    state.ro?.disconnect();
  };

  React.useEffect(() => {
    epubService.parseAllTrx(nodeService.state.activeGroupId).then(() => {
      const item = epubService.state.bookMap.get(nodeService.state.activeGroupId);
      const book = item?.at(0);
      if (book) {
        loadBook(book);
      }
    });

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.fullScreen) {
        handleToggleFullScreen();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      state.mousePosition.x = e.clientX;
      state.mousePosition.y = e.clientY;
    };

    window.addEventListener('keydown', handleEsc);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      destroy();
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className={classNames('flex-col', props.className)}>
      <EpubHeader />

      <div
        className={classNames(
          'flex flex-col flex-1 bg-white',
          !state.fullScreen && 'h-0',
          state.fullScreen && 'fixed inset-0 z-50',
        )}
        ref={epubReaderBox}
      >
        <div className="flex justify-between items-center flex-none gap-x-4 border-b px-6 h-[62px]">
          <EpubSelectBook
            onSelect={(v) => loadBook(v)}
            currentBookTrxId={state.bookTrxId}
          />
          <Tooltip title={`${state.bookMetadata?.title}${state.bookMetadata?.creator ? ` - ${state.bookMetadata?.creator}` : ''}`}>
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
          </Tooltip>

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

        {!state.book && (
          <div className="flex flex-col items-stretch h-full select-none">
            选本书
          </div>
        )}

        {!!state.book && (
          <div
            className="flex flex-col flex-1 items-stretch h-0 select-none"
            style={{
              background: readerThemes[readerSettingsService.state.theme].body.background,
            }}
          >
            <div className="flex flex-1 justify-between items-stretch h-0 relative">
              {state.spread && (
                <div className="flex flex-col absolute left-1/2 top-0 bottom-0 w-px py-12">
                  <div className="bg-gray-de flex-1" />
                </div>
              )}

              <div
                className="flex flex-center w-16 cursor-pointer group"
                onClick={handlePrev}
              >
                <ChevronLeft
                  className={classNames(
                    'text-36 text-gray-9c',
                    !state.atStart && 'group-hover:text-gray-33',
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
                    'text-36 text-gray-9c',
                    !state.atEnd && 'group-hover:text-gray-33',
                  )}
                />
              </div>
            </div>

            <div className="flex flex-none justify-between items-center gap-x-12 px-16 py-4">
              <div
                className={classNames(
                  'flex flex-none flex-center cursor-pointer group p-2 select-none',
                  !!state.currentSpineItem?.prev() && 'text-producer-blue',
                  !state.currentSpineItem?.prev() && 'text-gray-88',
                )}
                onClick={() => handleChangeChapter('prev')}
              >
                上一章
              </div>
              <Tooltip title={`${state.chapterProgress[1] + 1} / ${state.chapterProgress[2]}`}>
                <div className="py-5 w-full">
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
                className={classNames(
                  'flex flex-none flex-center cursor-pointer group p-2 select-none',
                  !!state.currentSpineItem?.next() && 'text-producer-blue',
                  !state.currentSpineItem?.next() && 'text-gray-88',
                )}
                onClick={() => handleChangeChapter('next')}
              >
                下一章
              </div>
            </div>
          </div>
        )}

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
