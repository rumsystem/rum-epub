import React from 'react';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import escapeStringRegexp from 'escape-string-regexp';
import { Book } from 'epubjs';
import { Popover, Tooltip, Pagination, Button, TextField, IconButton } from '@mui/material';
import { BiCommentDetail } from 'react-icons/bi';
import TrashIcon from 'boxicons/svg/regular/bx-trash.svg?fill-icon';

import MarkerIcon from '~/assets/icon_marker.svg?fill';
import { lang, modifierKeys, splitByHighlightText } from '~/utils';
import { HighlightItem, bookService, dialogService, nodeService, readerSettingsService } from '~/service';
import { createPost, groupLink } from '~/standaloneModals';

interface Props {
  className?: string
  book?: Book | null
  renderBox?: HTMLElement | null
}

const PAGE_SIZE = 5;

export const EpubAllHighlightButton = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,

    search: '',
    currentPage: 1,

    get list() {
      if (!this.search) {
        return bookService.state.highlight.local;
      }
      const regexp = new RegExp(escapeStringRegexp(this.search), 'i');
      return bookService.state.highlight.local.filter((v) => regexp.test(v.text));
    },
  }));
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const handleOpen = action(() => {
    state.open = true;
    state.currentPage = 1;
  });

  const handleClose = action(() => {
    state.open = false;
  });

  const handleJumpTo = (a: HighlightItem) => {
    props.book?.rendition.display(a.cfiRange);
    handleClose();
  };

  const handleRemove = async (v: HighlightItem) => {
    const result = await dialogService.open({
      content: lang.epubHighlights.confirmDelete,
    });
    if (result !== 'confirm') { return; }
    runInAction(() => {
      props.book?.rendition.annotations.remove(v.cfiRange, 'highlight');
      bookService.state.highlight.local.splice(bookService.state.highlight.local.indexOf(v), 1);
      bookService.highlight.delete(v.groupId, v.bookId, v.cfiRange);
    });
  };

  const handlePostHighlight = async (highlightItem: HighlightItem) => {
    const linkedGroupId = nodeService.state.groupLink[highlightItem.groupId];
    if (!linkedGroupId) {
      dialogService.open({
        content: lang.linkGroup.noCommentSeednetLinked,
        confirm: lang.linkGroup.goLink,
      }).then((v) => v === 'confirm' && groupLink({ groupId: highlightItem.groupId }));
      return;
    }
    handleClose();
    const post = await createPost({
      groupId: linkedGroupId,
      bookGroupId: bookService.state.current.groupId,
      bookId: bookService.state.current.bookId,
      quote: highlightItem.text,
      quoteRange: highlightItem.cfiRange,
    });
    if (post) {
      bookService.openBook({
        groupId: bookService.state.current.groupId,
        linkGroupId: linkedGroupId,
      });
    }
  };

  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const targetTagName = (e.target as HTMLElement)?.tagName.toLowerCase();
      if (['textarea', 'input'].includes(targetTagName)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'n' && modifierKeys(e, ['shift'])) {
        handleOpen();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  React.useEffect(reaction(
    () => state.search,
    action(() => {
      state.currentPage = 1;
    }),
  ), []);

  return (<>
    <Tooltip title={lang.epubHighlights.all}>
      <Button
        className={classNames(
          'flex flex-center p-0 w-8 h-8 min-w-0',
          props.className,
        )}
        onClick={handleOpen}
        ref={buttonRef}
        variant="text"
      >
        <div className="flex flex-center">
          <MarkerIcon
            className={classNames(
              'text-22',
              !readerSettingsService.state.dark && 'text-black',
              readerSettingsService.state.dark && 'text-gray-af',
            )}
          />
        </div>
      </Button>
    </Tooltip>

    <Popover
      classes={{ paper: 'mt-2' }}
      open={state.open}
      anchorEl={buttonRef.current}
      anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'center', vertical: 'top' }}
      onClose={handleClose}
      keepMounted
    >
      <div className="p-4 w-[600px]">
        <div className="text-center font-medium text-18">
          {lang.epubHighlights.title}
        </div>
        {!!bookService.state.highlight.local.length && (
          <div className="flex flex-center p-4 pb-0">
            <TextField
              className="flex-1"
              inputProps={{ className: 'text-14 ' }}
              value={state.search}
              onChange={action((e) => { state.search = e.target.value; })}
              placeholder={lang.epubHighlights.search}
              size="small"
            />
          </div>
        )}
        <div className="mt-4 overflow-y-auto max-h-[650px] divide-y border-y">
          {!state.list.length && (
            <div className="flex flex-center p-4">
              {!!state.search && lang.epubHighlights.noSearchItem}
              {!state.search && lang.epubHighlights.noItem}
            </div>
          )}
          {state.list.slice((state.currentPage - 1) * PAGE_SIZE, state.currentPage * PAGE_SIZE).map((v, i) => (
            <div
              className="flex hover:bg-gray-f7 cursor-pointer group"
              key={i}
            >
              <div
                className="flex-1 px-3 py-2 hover:text-producer-blue"
                onClick={() => handleJumpTo(v)}
              >
                <div className="overflow-hidden line-clamp-4">
                  {!state.search && v.text}
                  {!!state.search && splitByHighlightText(v.text, state.search).map((v, i) => (
                    <span
                      className={classNames(v.type === 'highlight' && 'text-highlight-green font-bold')}
                      key={i}
                    >
                      {v.text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden group-hover:flex items-center flex-none">
                <IconButton
                  className="flex flex-center flex-none p-2 text-gray-af hover:text-producer-blue"
                  onClick={() => handlePostHighlight(v)}
                >
                  <BiCommentDetail className="text-20 -mb-[2px]" />
                </IconButton>
                <IconButton
                  className="flex flex-center flex-none p-2 text-gray-af hover:text-red-500"
                  onClick={() => handleRemove(v)}
                >
                  <TrashIcon className="text-20" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-center mt-4">
          <Pagination
            page={state.currentPage}
            count={Math.max(Math.ceil(state.list.length / PAGE_SIZE), 1)}
            onChange={action((_, v) => { state.currentPage = v; })}
          />
        </div>
      </div>
    </Popover>
  </>);
});
