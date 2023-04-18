
import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import { Popover, Tooltip } from '@mui/material';
import { ArrowDropDown } from '@mui/icons-material';
import BookOpenIcon from 'boxicons/svg/regular/bx-book-open.svg?fill';

import BookIcon from '~/assets/icon_book.svg?fill-icon';
import { BookCoverImg, BookCoverImgTooltip } from '~/components';
import { BookSummary, bookService, readerSettingsService } from '~/service';
import { lang } from '~/utils';

interface Props {
  className?: string
}

export const EpubSelectBookButton = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,
    get groupId() {
      return bookService.state.current.groupId;
    },
    get currentBookId() {
      return bookService.state.current.bookId;
    },
    get books() {
      return bookService.state.groupMap.get(this.groupId) ?? [];
    },
  }));
  const buttonRef = React.useRef<HTMLDivElement>(null);

  const handleOpenBook = (book: BookSummary) => {
    bookService.openBook(book.groupId, book.id);
    handleClose();
  };

  const handleOpen = action(() => {
    state.open = true;
  });

  const handleClose = action(() => {
    state.open = false;
  });

  return (<>
    <div
      className={classNames(
        'flex items-center flex-none gap-x-2',
        props.className,
      )}
      ref={buttonRef}
    >
      <BookIcon
        className={classNames(
          'text-20',
          !readerSettingsService.state.dark && 'text-gray-6f',
          readerSettingsService.state.dark && 'text-gray-af',
        )}
      />
      <div
        className={classNames(
          'flex flex-center border-b pb-[3px] pl-1 text-16 cursor-pointer select-none',
          !readerSettingsService.state.dark && 'text-gray-6f border-gray-6f',
          readerSettingsService.state.dark && 'text-gray-af border-gray-af',
        )}
        onClick={handleOpen}
      >
        <span className="mr-2">{lang.epub.changeBook}</span>
        <ArrowDropDown />
      </div>
    </div>

    <Popover
      classes={{ paper: 'mt-2' }}
      open={state.open}
      anchorEl={buttonRef.current}
      anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'center', vertical: 'top' }}
      onClose={handleClose}
      keepMounted
    >
      <div className="p-2 w-[380px]">
        <div className="overflow-y-auto max-h-[400px]">
          {!state.books.length && (
            <div className="flex flex-center py-2">
              {lang.epub.noBook}
            </div>
          )}
          {state.books.map((v, i) => (
            <BookCoverImgTooltip
              groupId={state.groupId}
              bookId={v?.book.id ?? ''}
              key={i}
            >
              <div
                className="flex items-center gap-x-2 hover:bg-gray-f2 cursor-pointer p-2 relative"
                onClick={() => handleOpenBook(v.book)}
              >
                <BookCoverImg
                  className="max-h-12 max-w-12"
                  groupId={state.groupId}
                  bookId={v?.book.id ?? ''}
                  key={i}
                >
                  {(src) => (
                    <div
                      className="flex flex-center h-12 w-12 bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url("${src}")` }}
                    />
                  )}
                </BookCoverImg>
                <div className="flex-col flex-1">
                  <div className="truncate-2">
                    {v.book.title}
                  </div>
                  <div className="text-gray-af">
                    {lang.epub.uploadedAt(format(v.book.timestamp, 'yyyy-MM-dd hh:mm:ss'))}
                  </div>
                </div>
                <Tooltip title={lang.epub.currentReading}>
                  <div
                    className={classNames(
                      'px-2',
                      v.book.id !== state.currentBookId && 'opacity-0',
                    )}
                  >
                    <BookOpenIcon className="text-blue-400" />
                  </div>
                </Tooltip>
              </div>
            </BookCoverImgTooltip>
          ))}
        </div>
      </div>
    </Popover>
  </>);
});
