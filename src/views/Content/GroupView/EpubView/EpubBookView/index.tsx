import { posix } from 'path';
import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action, observable, reaction, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import Epub, { Book, Contents, Location, NavItem } from 'epubjs';
import Section from 'epubjs/types/section';
import { Annotation } from 'epubjs/types/annotations';
import { BiCommentDetail } from 'react-icons/bi';
import { Button, CircularProgress, ClickAwayListener, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import FullscreenIcon from 'boxicons/svg/regular/bx-fullscreen.svg?fill-icon';
import ExitFullscreenIcon from 'boxicons/svg/regular/bx-exit-fullscreen.svg?fill-icon';

import {
  bookService, linkTheme, progressBarTheme, readerSettingsService,
  readerThemes, dbService, nodeService, dialogService, HighlightItem, Post, linkGroupService,
} from '~/service';
import { addLinkOpen, lang, modifierKeys } from '~/utils';
import { BookCoverImgTooltip } from '~/components';
import { createPost, groupLink, quoteDetail } from '~/standaloneModals';

import MarkerIcon from '~/assets/icon_marker.svg?fill';

import { EpubShortCutPopover } from '../EpubShortCutPopover';
import { EpubAllHighlightButton } from '../EpubAllHighlightButton';
import { EpubChaptersButton } from '../EpubChaptersButton';
import { EpubSelectBookButton } from '../EpubSelectBookButton';
import { EpubSettings } from '../EpubSettings';
import { cfiRangeOverlap, chapterSearch, highLightRange } from '../helper';
import { lcsLength } from '~/utils/lcs';

interface Props {
  className?: string
}

export const EpubBookView = observer((props: Props) => {
  const state = useLocalObservable(() => observable({
    book: null as null | Book,

    // book states
    chapters: [] as Array<NavItem>,
    jumpingHistory: [] as Array<string>,
    currentHref: '',
    spread: false,
    atEnd: true,
    atStart: true,
    spineLoaded: false,
    fullScreen: false,
    loading: false,

    // other states
    highlightButton: null as null | { range: string, top: number, left: number },
    mousePosition: { x: 0, y: 0 },
    get bookId() {
      return bookService.state.current.bookId;
    },
    get bookData() {
      const { bookId, groupId } = bookService.state.current;
      return bookService.state.groupMap.get(groupId)?.find((v) => v.book.id === bookId);
    },
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
    get readerTheme() {
      return readerThemes[readerSettingsService.state.theme];
    },
  }));
  const renderBox = useRef<HTMLDivElement>(null);

  // const highlightState = useLocalObservable(() => ({
  //   items: [],
  //   temp: [],
  //   post: [],
  // } as HighlightContextType));

  const handlePrev = () => {
    if (state.atStart) { return; }
    state.book?.rendition?.prev?.();
  };

  const handleNext = () => {
    if (state.atEnd) { return; }
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
    if (!isRenditionReady || !renderBox.current) {
      return;
    }
    const rect = renderBox.current.getBoundingClientRect();
    try {
      state.book!.rendition.resize(rect.width, rect.height);
    } catch (e) {}
  };

  const handleAddHighlight = async () => {
    if (!state.highlightButton || !state.book) { return; }
    const cfiRange = state.highlightButton.range;
    const annotations: Array<Annotation> = Object.values((state.book.rendition.annotations as any)._annotations);
    const highlightState = bookService.state.highlight;
    const rangeExisted = annotations.some((v) => v.cfiRange === cfiRange)
      || highlightState.local.some((v) => v.cfiRange === cfiRange);
    if (rangeExisted) { return; }
    const text = (await state.book.getRange(cfiRange)).toString();
    const item: HighlightItem = {
      groupId: bookService.state.current.groupId,
      bookId: state.bookId,
      cfiRange,
      text,
    };
    bookService.highlight.save(item);
    runInAction(() => {
      state.highlightButton = null;
      highlightState.local.push(item);
    });
    highLightRange({
      groupId: bookService.state.current.groupId,
      bookId: state.bookId,
      cfiRange,
      book: state.book,
      onReapplyAnnotation: reApplyAnnotation,
      onReloadHighlights: loadHighlights,
    });

    const iframe: HTMLIFrameElement = (state.book as any).rendition?.manager?.views?._views?.[0]?.iframe;
    if (iframe) {
      iframe.contentWindow?.getSelection()?.removeAllRanges();
    }

    const linkedGroupId = nodeService.state.groupLink[bookService.state.current.groupId];
    if (!linkedGroupId) {
      return;
    }
    const chapters = chapterSearch(state.chapters, state.currentHref);
    // create an empty post if there's a linkGroup attached
    await linkGroupService.post.create({
      groupId: linkedGroupId,
      bookName: state.bookData?.book.title ?? '',
      bookId: state.bookId,
      content: '',
      ...chapters ? {
        chapter: chapters.map((v) => v.label.trim()).join(' -> '),
        chapterId: chapters.at(-1)!.href,
      } : {},
      quote: text,
      quoteRange: cfiRange,
    });
    loadHighlights();
  };

  const handlePostHighlight = async () => {
    if (!state.highlightButton || !state.book) {
      return;
    }

    const bookGroupId = bookService.state.current.groupId;
    const bookId = bookService.state.current.bookId;
    const cfiRange = state.highlightButton.range;
    const range = await state.book.getRange(cfiRange);
    const text = range.toString();

    const chapters = chapterSearch(state.chapters, state.currentHref);
    const iframe: HTMLIFrameElement = (state.book as any).rendition?.manager?.views?._views?.[0]?.iframe;
    if (iframe) {
      iframe.contentWindow?.getSelection()?.removeAllRanges();
    }

    const linkGroupId = nodeService.state.groupLink[bookService.state.current.groupId];
    if (!linkGroupId) {
      dialogService.open({
        content: lang.linkGroup.noCommentSeednetLinked,
        confirm: lang.linkGroup.goLink,
      }).then((v) => v === 'confirm' && groupLink({ groupId: bookService.state.current.groupId }));
      return;
    }
    const post = await createPost({
      groupId: linkGroupId,
      bookGroupId,
      bookId,
      ...chapters ? {
        chapter: chapters.map((v) => v.label.trim()).join(' -> '),
        chapterId: chapters.at(-1)!.href,
      } : {},
      quote: text,
      quoteRange: cfiRange,
    });
    if (post) {
      const item: HighlightItem = {
        groupId: bookService.state.current.groupId,
        bookId: state.bookId,
        cfiRange,
        text,
      };
      quoteDetail({
        post,
        groupId: bookGroupId,
        onReapplyAnnotation: reApplyAnnotation,
        onReloadHighlights: loadHighlights,
      });
      await bookService.highlight.save(item);
      loadHighlights();
    }
  };

  const handlePostComment = async () => {
    const groupId = nodeService.state.groupLink[bookService.state.current.groupId];
    const group = nodeService.state.groupMap[groupId];
    if (!group) {
      dialogService.open({
        content: lang.linkGroup.noCommentSeednetLinked,
        confirm: lang.linkGroup.goLink,
      }).then((v) => v === 'confirm' && groupLink({ groupId: bookService.state.current.groupId }));
      return;
    }

    const chapterSearch = (chapters: Array<NavItem>, targetHref: string): Array<NavItem> | undefined => {
      for (const v of chapters) {
        const href = v.href.replace(/#.*/, '');
        if (targetHref === href) {
          return [v];
        }
        if (v.subitems) {
          const childMatch = chapterSearch(v.subitems, targetHref);
          if (childMatch) {
            return [v, ...childMatch];
          }
        }
      }
    };

    const chapters = chapterSearch(state.chapters, state.currentHref);
    const post = await createPost({
      bookGroupId: bookService.state.current.groupId,
      groupId,
      bookId: bookService.state.current.bookId,
      ...chapters ? {
        chapter: chapters.map((v) => v.label.trim()).join(' -> '),
        chapterId: chapters.at(-1)!.href,
      } : {},
    });
    if (post) {
      bookService.openBook({
        groupId: bookService.state.current.groupId,
        linkGroupId: groupId,
      });
    }
  };

  const reApplyAnnotation = () => {
    const book = state.book;
    const groupId = bookService.state.current.groupId;
    if (!book) { return; }
    const annotations: Array<Annotation> = Object.values((book.rendition.annotations as any)._annotations);
    const highlights = annotations;
    highlights.forEach((v) => {
      book.rendition.annotations.remove(v.cfiRange, v.type);
    });
    const highlightState = bookService.state.highlight;
    const commonParams = {
      book,
      bookId: state.bookId,
      groupId,
      onReapplyAnnotation: reApplyAnnotation,
      onReloadHighlights: loadHighlights,
    };

    highlightState.post.forEach((v) => {
      highLightRange({
        ...commonParams,
        cfiRange: v.quoteRange,
        post: v,
      });
    });
    highlightState.local.forEach((v) => {
      highLightRange({
        ...commonParams,
        cfiRange: v.cfiRange,
      });
    });
    highlightState.temp.forEach((v) => {
      highLightRange({
        ...commonParams,
        cfiRange: v,
        temp: true,
      });
    });
  };

  const loadHighlights = async () => {
    const { groupId, bookId } = bookService.state.current;
    const newState = observable({
      local: [],
      temp: [],
      post: [],
    } as typeof bookService.state.highlight);
    runInAction(() => {
      bookService.state.highlight = newState;
    });

    const loadSavedHighlights = async () => {
      const highlights = await bookService.highlight.get(
        groupId,
        bookId,
      );
      if (bookService.state.highlight !== newState) { return; }
      const highlightState = bookService.state.highlight;
      runInAction(() => {
        if (bookService.state.current.href.startsWith('epubcfi(')) {
          highlightState.temp.push(bookService.state.current.href);
        }
        highlights.forEach((v) => {
          highlightState.local.push(v);
        });
      });
    };

    const loadLinkGroupHighlights = async () => {
      const linkGroupId = nodeService.state.groupLink[groupId];
      if (!linkGroupId) { return; }
      const items = await dbService.listPost({
        groupId: linkGroupId,
        limit: 200,
        offset: 0,
        order: 'hot',
        bookId,
        quote: true,
      });
      if (bookService.state.highlight !== newState) { return; }
      const highlightState = bookService.state.highlight;
      const list: Array<Post & { children?: Array<Post> }> = [];
      items.forEach((post: Post & { children?: Array<Post> }) => {
        let overlapped = false;
        for (const item of list) {
          const overlap = cfiRangeOverlap(post.quoteRange, item.quoteRange);
          if (!overlap) { continue; }
          const overlapSize = lcsLength(post.quote, item.quote);
          const minLength = Math.min(post.quote.length, item.quote.length);
          const percentage = minLength ? overlapSize / minLength : 1;
          if (percentage > 0.8) {
            if (post.quote.length > item.quote.length) {
              list.splice(list.indexOf(item), 1);
              delete item.children;
              list.push(post);
              post.children ??= [];
              post.children.push(item);
              // swap
            } else {
              item.children ??= [];
              item.children.push(post);
            }
            overlapped = true;
            break;
          }
        }
        if (!overlapped) {
          list.push(post);
        }
      });
      if (!list.length) { return; }
      runInAction(() => {
        list.forEach((v) => {
          highlightState.post.push(v);
        });
      });
    };

    await Promise.all([
      loadSavedHighlights(),
      loadLinkGroupHighlights(),
    ]);

    reApplyAnnotation();
  };

  const loadBook = async () => {
    const { groupId, bookId } = bookService.state.current;
    const bookBuffer = await dbService.getBookBuffer(groupId, bookId);
    if (!bookBuffer) { return; }
    if (!renderBox.current) { return; }
    const book = Epub(bookBuffer.file.buffer);
    runInAction(() => {
      state.book = book;
      state.loading = false;
    });

    const now = Date.now();
    dbService.updateBookOpenTime(groupId, bookId, now);
    bookService.updateBookOpenTime(groupId, bookId, now);

    // book.loaded.metadata.then(action((v) => {
    //   state.bookMetadata = { ...v };
    // }));
    book.loaded.spine.then(action(() => {
      state.spineLoaded = true;
    }));
    (window as any).book = book;
    const rendition = book.renderTo(renderBox.current, {
      width: '100%',
      height: '100%',
      // flow: 'scrolled-doc',
      ignoreClass: 'rum-annotation-hl',
      // spread: 'none',
      minSpreadWidth: 950,
    });

    if (bookService.state.current.href) {
      rendition.display(bookService.state.current.href);
    } else {
      const readingProgress = await bookService.readingProgress.get(groupId, bookId);
      rendition.display(readingProgress?.readingProgress ?? undefined);
    }

    loadHighlights();

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
      bookService.readingProgress.save(
        groupId,
        bookId,
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
      reApplyAnnotation();
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

  useEffect(() => {
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
    ro.observe(renderBox.current!);

    const disposes = [
      () => ro.disconnect(),
      () => {
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('mousemove', handleMouseMove);
      },
      () => {
        try {
          state.book?.destroy();
        } catch (e) {
          console.error(e);
        }
      },
      reaction(
        () => [bookService.state.current.groupId, bookService.state.current.bookId],
        loadBook,
        { fireImmediately: true },
      ),
    ];

    return () => {
      disposes.forEach((v) => v());
    };
  }, []);

  const lightTheme = ['white', 'light'].includes(readerSettingsService.state.theme);
  const darkTheme = ['dark', 'black'].includes(readerSettingsService.state.theme);

  return (
    <div className={classNames('flex-col', props.className)}>
      <div
        className={classNames(
          'flex flex-col flex-1',
          !state.fullScreen && 'h-0',
          state.fullScreen && 'fixed inset-0 z-50',
        )}
        style={{
          backgroundColor: readerThemes[readerSettingsService.state.theme].body.background,
        }}
      >
        <div
          className={classNames(
            'flex justify-between items-center flex-none gap-x-4 px-4 h-[40px] border-b',
            !readerSettingsService.state.dark && 'bg-white',
            readerSettingsService.state.dark && 'bg-gray-2c',
          )}
        >
          <EpubSelectBookButton />
          <BookCoverImgTooltip
            groupId={bookService.state.current.groupId}
            bookId={bookService.state.current.bookId}
            placement="bottom"
          >
            <div className="text-18 truncate">
              <span
                className={classNames(
                  !readerSettingsService.state.dark && 'text-gray-33',
                  readerSettingsService.state.dark && 'text-gray-f7',
                )}
              >
                {state.bookData?.book.title}
              </span>
              {!!state.bookData?.metadata?.metadata.author && (
                <span className="text-gray-9c">
                  &nbsp;-&nbsp;
                  <span className="text-14">
                    {state.bookData?.metadata?.metadata.author}
                  </span>
                </span>
              )}
            </div>
          </BookCoverImgTooltip>

          <div className="flex items-center gap-x-1">
            <EpubChaptersButton
              chapters={state.chapters}
              current={state.currentHref}
              onChapterClick={handleJumpToChapter}
            />
            <EpubAllHighlightButton book={state.book} />
            <EpubSettings
              book={state.book}
              bookTrx={state.bookId}
              onSettingChange={() => reApplyAnnotation()}
            />
            <Tooltip title={lang.linkGroup.comment}>
              <Button
                className="flex flex-center p-0 w-8 h-8 min-w-0"
                onClick={handlePostComment}
                variant="text"
              >
                <BiCommentDetail
                  className={classNames(
                    'text-20 -mb-[2px]',
                    !readerSettingsService.state.dark && 'text-black',
                    readerSettingsService.state.dark && 'text-gray-af',
                  )}
                />
              </Button>
            </Tooltip>
            <EpubShortCutPopover />
            <Tooltip title={lang.epub.toggleFullscreen}>
              <Button
                className="flex flex-center p-0 w-8 h-8 min-w-0"
                onClick={handleToggleFullScreen}
                variant="text"
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
              </Button>
            </Tooltip>
          </div>
        </div>

        {state.loading && (
          <div
            className="flex flex-1 flex-center"
            style={{ background: state.readerTheme.body.background }}
          >
            <CircularProgress className="text-gray-ec" />
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
              className={classNames(
                'flex flex-1 w-0 h-full max-w-[1750px] epub-highlight-box',
                `theme-${readerSettingsService.state.theme}`,
              )}
              ref={renderBox}
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
              {lang.epub.prevChapter}
            </div>
            {!!state.jumpingHistory.length && (
              <div
                className="flex flex-none flex-center cursor-pointer group px-4 text-producer-blue select-none"
                onClick={handleBackJumpingHistory}
              >
                {lang.epub.backToPrevPos}
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
              {lang.epub.nextChapter}
            </div>
          </div>
        </div>

        {!!state.highlightButton && (
          <ClickAwayListener onClickAway={action(() => { state.highlightButton = null; })}>
            <div
              className="fixed flex bg-white rounded shadow-4 px-px"
              style={{
                left: `${state.highlightButton?.left ?? 0}px`,
                top: `${state.highlightButton?.top ?? 0}px`,
              }}
            >
              <Tooltip title="highlight" disableInteractive arrow>
                <div
                  className="p-[6px] cursor-pointer"
                  onClick={handleAddHighlight}
                >
                  <MarkerIcon className="text-black/50" />
                </div>
              </Tooltip>
              <div
                className="p-[6px] cursor-pointer"
                onClick={handlePostHighlight}
              >
                <BiCommentDetail className="text-20 -mb-[2px] text-producer-blue" />
              </div>
            </div>
          </ClickAwayListener>
        )}
      </div>
    </div>
  );
});
