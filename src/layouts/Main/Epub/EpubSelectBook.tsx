import React from 'react';
import classNames from 'classnames';
import { action, observable, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import { FormControl, MenuItem, Popover, Select } from '@material-ui/core';

import BookContentIcon from 'boxicons/svg/regular/bx-book-content.svg?react';

import useActiveGroup from 'store/selectors/useActiveGroup';

import { getAllEpubs, EpubBook } from './split';

interface Props {
  className?: string
  onSelect?: (v: EpubBook) => unknown
  currentBookTrxId?: string
}

export const EpubSelectBook = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,

    books: [] as Array<EpubBook>,
  }), { books: observable.shallow });
  const activeGroup = useActiveGroup();
  const buttonRef = React.useRef<HTMLDivElement>(null);

  const handleSelectFile = (v: EpubBook) => {
    props.onSelect?.(v);
    handleClose();
  };

  const handleOpen = action(() => {
    state.open = true;
    loadBooks();
  });

  const handleClose = action(() => {
    state.open = false;
  });

  const loadBooks = async () => {
    const books = await getAllEpubs(activeGroup.group_id);
    runInAction(() => {
      state.books = books;
    });
  };

  React.useEffect(() => {
    loadBooks();
  }, []);

  return (<>
    <div
      className={classNames(
        'flex items-center',
        props.className,
      )}
      ref={buttonRef}
    >
      <BookContentIcon width="24" height="24" />
      <FormControl className="flex-none ml-2">
        <Select
          className="pr-2"
          value={1}
          open={false}
          onOpen={handleOpen}
          onFocus={(e) => e.target.blur()}
        >
          <MenuItem value={1}>切换书籍</MenuItem>
        </Select>
      </FormControl>
    </div>

    <Popover
      classes={{ paper: 'mt-2' }}
      open={state.open}
      anchorEl={buttonRef.current}
      anchorOrigin={{
        horizontal: 'center',
        vertical: 'bottom',
      }}
      transformOrigin={{
        horizontal: 'center',
        vertical: 'top',
      }}
      onClose={handleClose}
      keepMounted
    >
      <div className="p-2 w-[350px]">
        <div className="overflow-y-auto max-h-[400px]">
          {state.books.map((v, i) => (
            <div
              className="hover:bg-gray-f2 cursor-pointer p-2 relative"
              onClick={() => handleSelectFile(v)}
              key={i}
            >
              {v.trxId === props.currentBookTrxId && (
                <div className="absolute w-1 h-full left-0 top-0 bg-blue-400" />
              )}
              <div>
                {v.title}
              </div>
              <div className="text-gray-af">
                {format(v.date, 'yyyy-MM-dd hh:mm:ss')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Popover>
  </>);
});
