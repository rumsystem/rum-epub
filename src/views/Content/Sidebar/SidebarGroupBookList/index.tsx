import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import escapeStringRegexp from 'escape-string-regexp';
import { BookCoverImg, GroupIcon } from '~/components';
import { BookSummary, GroupMapBookItem, bookService } from '~/service';
import { Popover } from '@mui/material';
import { GroupPopup } from './GroupPopup';

interface Props {
  groupSortMode: 'recent-open' | 'recent-add'
  booksOnly: boolean
  viewMode: 'list' | 'grid'
  search: string
}

export const SidebarGroupBookList = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    groupPopup: {
      open: false,
      anchor: null as null | HTMLDivElement,
      groupId: '',
    },
    cachedOpenTimes: new Map<string, number>(),
  }));

  const handleClickGroup = action((groupId: string) => {
    bookService.openBook(groupId, '');
  });

  const handleClickBook = (groupId: string, bookId: string) => {
    bookService.openBook(groupId, bookId);
  };

  const filterSearch = React.useCallback((item: GroupMapBookItem) => {
    const search = props.search.trim();
    if (!search) { return item; }
    const conditions = search.split(' ').map((v) => new RegExp(escapeStringRegexp(v), 'i'));
    const titleMatch = conditions.every((u) => u.test(item.book.title));
    const authorMatch = conditions.every((u) => u.test(item.metadata?.metadata.author ?? ''));
    return titleMatch || authorMatch;
  }, [props.search]);

  const getBookOpenTime = (book: BookSummary) => state.cachedOpenTimes.get(`${book.groupId}-${book.id}`) ?? book.openTime;

  const applyFilterAndSort = (items: Array<GroupMapBookItem>) => {
    const arr = items.filter(filterSearch).sort((a, b) => {
      if (props.groupSortMode === 'recent-add') {
        return b.book.timestamp - a.book.timestamp;
      }
      return getBookOpenTime(b.book) - getBookOpenTime(a.book);
    });
    return arr;
  };

  const renderGridBooks = (items: Array<GroupMapBookItem>, className?: string) => (
    <div
      className={classNames(
        'grid grid-cols-3 justify-items-center px-1 py-4 gap-y-3',
        className,
      )}
    >
      {items.map((item) => {
        const bookActive = bookService.state.current.bookId === item.book.id;
        return (
          <div
            className={classNames(
              'flex-col items-center w-[76px]',
            )}
            key={`${item.book.groupId}-${item.book.id}`}
            onClick={() => handleClickBook(item.book.groupId, item.book.id)}
          >
            <BookCoverImg
              bookId={item.book.id}
              groupId={item.book.groupId}
            >
              {(src) => (
                <div
                  className={classNames(
                    'flex flex-center rounded-6 w-[76px] h-[104px] flex-none overflow-hidden',
                    'bg-cover bg-center bg-gray-f7 duration-100',
                    !bookActive && 'shadow-1',
                    bookActive && 'shadow-4b',
                  )}
                  style={{
                    backgroundImage: `url("${src}")`,
                  }}
                />
              )}
            </BookCoverImg>
            <div
              className="mt-2 leading-snug text-12 break-all overflow-hidden text-gray-9c"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: '4',
                WebkitBoxOrient: 'vertical',
              }}
            >
              <span className="font-medium text-12 text-black">
                {item.book.title}
              </span>
              <br />
              <span className="text-10 text-gray-9c">
                {item.metadata?.metadata.author}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListBooks = (items: Array<GroupMapBookItem>, className?: string, indent = true) => (
    <div className={className}>
      {items.map((item) => {
        const bookActive = bookService.state.current.bookId === item.book.id;
        return (
          <div
            className={classNames(
              'flex h-[50px] pr-4',
              bookActive && 'bg-gray-ec',
            )}
            key={`${item.book.groupId}-${item.book.id}`}
            onClick={() => handleClickBook(item.book.groupId, item.book.id)}
          >
            <div className={
              classNames(
                'flex items-center flex-1 w-0',
                indent && 'ml-6',
                !indent && 'ml-3',
              )
            }
            >
              <BookCoverImg
                bookId={item.book.id}
                groupId={item.book.groupId}
              >
                {(src) => (
                  <div
                    className="rounded-6 mr-2 w-6 h-6 flex-none overflow-hidden shadow-1 bg-cover bg-center bg-gray-f7"
                    style={{ backgroundImage: `url("${src}")` }}
                  />
                )}
              </BookCoverImg>
              <div className="truncate text-gray-9c">
                <span className="font-medium text-14 text-black">
                  {item.book.title}
                </span>
                {' '}
                <span className="text-12 text-gray-9c">
                  {item.metadata?.metadata.author}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  React.useEffect(action(() => {
    if (props.groupSortMode === 'recent-open') {
      state.cachedOpenTimes = new Map();
    }
  }), [props.groupSortMode]);

  React.useEffect(action(() => {
    const books = bookService.state.groups.flatMap((v) => v.books);
    books.map((v) => [`${v.book.groupId}-${v.book.id}`, v.book.openTime] as const).forEach(([k, v]) => {
      if (!state.cachedOpenTimes.has(k)) {
        state.cachedOpenTimes.set(k, v);
      }
    });
  }));

  const orderedGroups = [...bookService.state.groups].sort((a, b) => {
    if (props.groupSortMode === 'recent-add') {
      return Math.max(...b.books.map((v) => v.book.timestamp)) - Math.max(...a.books.map((v) => v.book.timestamp));
    }
    return Math.max(...b.books.map((v) => getBookOpenTime(v.book))) - Math.max(...a.books.map((v) => getBookOpenTime(v.book)));
  });

  return (<>
    <div className="divide-y border-y">
      {!props.booksOnly && orderedGroups.map((item) => {
        const isOwner = item.group.owner_pubkey === item.group.user_pubkey;
        const active = bookService.state.current.groupId === item.group.group_id
          && !bookService.state.current.bookId;
        const books = applyFilterAndSort(item.books);

        return (
          <div key={item.group.group_id}>
            <div
              className={classNames(
                'flex justify-between items-center leading-none h-[50px] px-3',
                'text-14 relative cursor-pointer border-gray-ec',
                active && 'bg-black text-white',
                !active && 'bg-white text-black',
              )}
              onClick={() => handleClickGroup(item.group.group_id)}
              onContextMenu={action((e) => {
                e.preventDefault();
                state.groupPopup = {
                  open: true,
                  anchor: e.currentTarget,
                  groupId: item.group.group_id,
                };
              })}
            >
              <div
                className={classNames(
                  'w-[3px] h-full flex flex-col items-stretch absolute left-0',
                  !active && 'py-px',
                )}
              >
                {isOwner && <div className="flex-1 bg-[#ff931e]" />}
              </div>

              <div className="flex grow items-center self-stretch">
                <GroupIcon
                  className="rounded-6 mr-2 w-6 flex-none"
                  width={24}
                  height={24}
                  fontSize={14}
                  group={item.group}
                // colorClassName={active ? 'text-gray-33' : 'text-white'}
                />
                <div className="flex-1 w-0 py-1 font-medium truncate text-14 truncate">
                  {item.group.group_name}
                </div>
                <div className="text-gray-9c flex-none text-12 ml-2">
                  {books.length}
                </div>
              </div>
            </div>

            {!!books.length && (<>
              {props.viewMode === 'list' && renderListBooks(books)}
              {props.viewMode === 'grid' && renderGridBooks(books)}
            </>)}
          </div>
        );
      })}
      {props.booksOnly && props.viewMode === 'list' && renderListBooks(applyFilterAndSort(bookService.state.groups.flatMap((v) => v.books)), '', false)}
      {props.booksOnly && props.viewMode === 'grid' && renderGridBooks(applyFilterAndSort(bookService.state.groups.flatMap((v) => v.books)))}
    </div>

    <Popover
      classes={{
        root: 'pointer-events-none',
        paper: 'pointer-events-auto',
      }}
      open={state.groupPopup.open}
      onClose={action(() => { state.groupPopup.open = false; })}
      anchorEl={state.groupPopup.anchor}
      anchorOrigin={{
        horizontal: 'right',
        vertical: 'center',
      }}
      transformOrigin={{
        horizontal: 'left',
        vertical: 'center',
      }}
    >
      {!!state.groupPopup.groupId && (
        <GroupPopup
          groupId={state.groupPopup.groupId}
          onClickAway={action(() => { state.groupPopup.open = false; })}
          onClose={action(() => { state.groupPopup.open = false; })}
        />
      )}
    </Popover>
    <div />
  </>);
});
