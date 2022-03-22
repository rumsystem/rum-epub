import React from 'react';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Popover, Tooltip, Pagination, Input } from '@mui/material';
import { Book } from 'epubjs';
import { Annotation } from 'epubjs/types/annotations';
import EditAltIcon from 'boxicons/svg/regular/bx-edit-alt.svg?react';
import TrashIcon from 'boxicons/svg/regular/bx-trash.svg?fill';
import escapeStringRegexp from 'escape-string-regexp';
import { splitByHighlightText } from '~/utils';

interface Props {
  className?: string
  book?: Book | null
  renderBox?: HTMLElement | null
}

interface ArrItem { a: Annotation, text: string }

const PAGE_SIZE = 5;

export const EpubAllHighlightButton = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,

    arr: [] as Array<ArrItem>,
    search: '',
    currentPage: 1,

    get list() {
      if (!this.search) {
        return this.arr;
      }
      const regexp = new RegExp(escapeStringRegexp(this.search), 'i');
      return this.arr.filter((v) => regexp.test(v.text));
    },
  }));
  const buttonRef = React.useRef<HTMLDivElement>(null);

  const handleOpen = action(async () => {
    state.open = true;
    state.currentPage = 1;
    const book = props.book;
    if (!book) {
      return;
    }

    const annotations: Array<Annotation> = Object.values((book.rendition.annotations as any)._annotations);

    const arr = await Promise.all(
      annotations.map(async (v) => {
        const range = await book.getRange(v.cfiRange);
        const text = range.toString();
        return {
          a: v,
          text,
        };
      }),
    );

    runInAction(() => {
      state.arr = arr;
    });
  });

  const handleClose = action(() => {
    state.open = false;
  });

  const handleJumpTo = (a: Annotation) => {
    props.book?.rendition.display(a.cfiRange);
    handleClose();
  };

  const handleRemove = action((v: ArrItem) => {
    props.book?.rendition.annotations.remove(v.a.cfiRange, 'highlight');
    state.arr.splice(state.arr.indexOf(v), 1);
  });

  React.useEffect(reaction(
    () => state.search,
    action(() => {
      state.currentPage = 1;
    }),
  ), []);

  return (<>
    <Tooltip title="所有标注">
      <div
        className={classNames(
          'cursor-pointer',
          props.className,
        )}
        onClick={handleOpen}
        ref={buttonRef}
      >
        <EditAltIcon
          width="24"
          height="24"
        />
      </div>
    </Tooltip>

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
      <div className="p-4 w-[600px]">
        <div className="text-center font-medium text-18">
          标注列表
        </div>
        {!!state.arr.length && (
          <div className="flex flex-center p-4 pb-0">
            <Input
              className="flex-1"
              value={state.search}
              onChange={action((e) => { state.search = e.target.value; })}
              placeholder="搜索"
            />
          </div>
        )}
        <div className="mt-4 overflow-y-auto max-h-[650px] divide-y border-y">
          {!state.arr.length && (
            <div className="flex flex-center p-4">
              暂无标注
            </div>
          )}
          {state.list.slice((state.currentPage - 1) * PAGE_SIZE, state.currentPage * PAGE_SIZE).map((v, i) => (
            <div
              className="flex hover:bg-gray-f7 cursor-pointer group"
              key={i}
            >
              <div
                className="flex-1 px-3 py-2 hover:text-producer-blue"
                onClick={() => handleJumpTo(v.a)}
              >
                <div
                  className="overflow-hidden"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: '4',
                    WebkitBoxOrient: 'vertical',
                  }}
                >
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
              <div
                className="flex flex-center flex-none p-2 text-gray-af hover:text-producer-blue opacity-0 group-hover:opacity-100"
                onClick={() => handleRemove(v)}
              >
                <TrashIcon />
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
