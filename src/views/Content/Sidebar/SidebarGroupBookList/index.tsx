import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import escapeStringRegexp from 'escape-string-regexp';
import { BookCoverImg, GroupIcon } from '~/components';
import { epubService, GroupBookItem, nodeService } from '~/service';
import { Popover } from '@mui/material';
import { GroupPopup } from './GroupPopup';
import { IGroup } from '~/apis';

interface Props {
  groupSortMode: 'recent-open' | 'recent-add'
  booksOnly: boolean
  viewMode: 'list' | 'grid'
  search: string
}

export const SidebarGroupBookList = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    groupSortMode: props.groupSortMode,
    search: '',
    clickOrder: [] as Array<string>,
    groupPopup: {
      open: false,
      anchor: null as null | HTMLDivElement,
      group: null as null | IGroup,
    },
    get orderedGroups() {
      // TODO: sort books also
      const orderArr = state.groupSortMode === 'recent-add'
        ? nodeService.state.groupJoinOrder
        : state.clickOrder;
      const reg = this.search ? new RegExp(escapeStringRegexp(this.search)) : null;
      return [
        ...orderArr
          .map((v) => nodeService.state.groupMap[v])
          .filter(<T extends unknown>(v: T | undefined): v is T => !!v),
        ...nodeService.state.groups.filter((v) => !orderArr.includes(v.group_id)),
      ].filter((v) => !reg || reg.test(v.group_name));
    },
    get allBooks() {
      return [...epubService.state.groupMap.entries()].flatMap(
        ([groupId, group]) => group.books.map(
          (book) => ({ book, groupId }),
        ),
      );
    },
  }));

  const handleClickGroup = action((groupId: string) => {
    epubService.openBook(groupId);
  });

  const handleClickBook = action((groupId: string, bookTrx: string) => {
    epubService.openBook(groupId, bookTrx);
  });

  React.useEffect(() => {
    state.clickOrder = [...epubService.state.groupOrder];
  }, [props.groupSortMode]);

  React.useEffect(action(() => {
    state.search = props.search;
  }), [props.search]);


  const renderGridBooks = (items: Array<{ book: GroupBookItem, groupId: string }>, className?: string) => (
    <div
      className={classNames(
        'grid grid-cols-3 justify-items-center px-1 py-4 gap-y-3',
        className,
      )}
    >
      {items.map((item) => {
        const bookActive = epubService.state.current.bookTrx === item.book.trxId;
        return (
          <div
            className={classNames(
              'flex-col items-center w-[76px]',
            )}
            key={item.book.trxId}
            onClick={() => handleClickBook(item.groupId, item.book.trxId)}
          >
            <BookCoverImg
              bookTrx={item.book.trxId}
              groupId={item.groupId}
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
                {item.book.fileInfo.title}
              </span>
              <br />
              <span className="text-10 text-gray-9c">
                {item.book.metadata?.author}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (<>
    <div>
      {!props.booksOnly && (
        <div className="">
          {state.orderedGroups.map((group, i) => {
            const isOwner = group.owner_pubkey === group.user_pubkey;
            const active = epubService.state.current.groupId === group.group_id && !epubService.state.current.bookTrx;
            const books = epubService.getGroupItem(group.group_id).books;
            return (
              <div
                key={group.group_id}
              >
                <div
                  className={classNames(
                    'flex justify-between items-center leading-none h-[50px] px-3',
                    'text-14 relative cursor-pointer border-b border-gray-ec',
                    i === 0 && 'border-t',
                    active && 'bg-black text-white',
                    !active && 'bg-white text-black',
                  )}
                  onClick={() => handleClickGroup(group.group_id)}
                  onContextMenu={action((e) => {
                    e.preventDefault();
                    state.groupPopup = {
                      open: true,
                      anchor: e.currentTarget,
                      group,
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
                      group={group}
                      colorClassName={active ? 'text-gray-33' : 'text-white'}
                    />
                    <div className="flex-1 w-0 py-1 font-medium truncate text-14 truncate">
                      {group.group_name}
                    </div>
                    <div className="text-gray-9c flex-none text-12 ml-2">
                      {books.length}
                    </div>
                  </div>
                </div>

                {!!books.length && (<>
                  {props.viewMode === 'list' && (
                    <div className="border-b border-gray-f2">
                      {books.map((book, i) => {
                        const bookActive = epubService.state.current.bookTrx === book.trxId;
                        return (
                          <div
                            className={classNames(
                              'flex',
                              bookActive && 'bg-gray-ec',
                            )}
                            key={book.trxId}
                            onClick={() => handleClickBook(group.group_id, book.trxId)}
                          >
                            <div
                              className={classNames(
                                'flex flex-center w-10 h-[50px]',
                                i === 0 && 'pt-3',
                                i === books.length - 1 && 'pb-3',
                              )}
                            >
                              <div
                                className={classNames(
                                  'h-full w-px bg-gray-ce',
                                  !bookActive && 'bg-gray-ce',
                                  bookActive && 'bg-gray-bf',
                                )}
                              />
                            </div>
                            <div className="flex items-center flex-1 w-0">
                              <BookCoverImg
                                bookTrx={book.trxId}
                                groupId={group.group_id}
                              >
                                {(src) => (
                                  <div
                                    className="rounded-6 mr-2 w-6 h-6 flex-none overflow-hidden shadow-1 bg-cover bg-center bg-gray-f7"
                                    style={{ backgroundImage: `url("${src}")` }}
                                  />
                                )}
                              </BookCoverImg>
                              <div className="truncate text-gray-9c pr-4">
                                <span className="font-medium text-14 text-black">
                                  {book.fileInfo.title}
                                </span>
                                {' '}
                                <span className="text-12 text-gray-9c">
                                  {book.metadata?.author}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {props.viewMode === 'grid' && renderGridBooks(
                    books.map((book) => ({ book, groupId: group.group_id })),
                    'border-b border-gray-f2',
                  )}
                </>)}
              </div>
            );
          })}
        </div>
      )}
      {props.booksOnly && props.viewMode === 'list' && (
        <div>
          {state.allBooks.map((item) => {
            const bookActive = epubService.state.current.bookTrx === item.book.trxId;
            return (
              <div
                className={classNames(
                  'flex items-center h-[50px] px-4',
                  bookActive && 'bg-gray-ec',
                )}
                key={item.book.trxId}
                onClick={() => handleClickBook(item.groupId, item.book.trxId)}
              >
                <BookCoverImg
                  bookTrx={item.book.trxId}
                  groupId={item.groupId}
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
                    {item.book.fileInfo.title}
                  </span>
                  {' '}
                  <span className="text-12 text-gray-9c">
                    {item.book.metadata?.author}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {props.booksOnly && props.viewMode === 'grid' && renderGridBooks(state.allBooks)}
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
      {!!state.groupPopup.group && (
        <GroupPopup
          group={state.groupPopup.group}
          onClickAway={action(() => { state.groupPopup.open = false; })}
          onClose={action(() => { state.groupPopup.open = false; })}
        />
      )}
    </Popover>
  </>);
});
