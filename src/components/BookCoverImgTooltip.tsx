
import React from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Tooltip, TooltipProps } from '@mui/material';

import { epubService } from '~/service';

interface BookCoverImgProps extends Omit<TooltipProps, 'title'> {
  children: React.ReactElement
  groupId: string
  bookTrx: string
}

export const BookCoverImgTooltip = observer((props: BookCoverImgProps) => {
  const state = useLocalObservable(() => ({
    open: false,
    groupId: '',
    bookTrx: '',
    get img() {
      const groupItem = epubService.getGroupItem(state.groupId);
      const book = groupItem.books.find((v) => v.trxId === state.bookTrx);
      const img = book?.cover.cover || null;
      return img;
    },
  }));

  const handleOpen = action(() => {
    epubService.parseSubData(props.groupId, props.bookTrx);
    state.open = true;
  });

  const handleClose = action(() => {
    state.open = false;
  });

  React.useEffect(() => {
    runInAction(() => {
      state.groupId = props.groupId;
      state.bookTrx = props.bookTrx;
    });
  }, [props.groupId, props.bookTrx]);

  const { groupId, bookTrx, children, ...rest } = props;
  return (
    <Tooltip
      classes={{
        tooltip: 'bg-transparent',
      }}
      open={state.open && !!state.img}
      onOpen={handleOpen}
      onClose={handleClose}
      disableInteractive
      title={(
        <img
          className="shadow-4 rounded"
          src={state.img ?? ''}
          width="200"
        />
      )}
      placement="right"
      {...rest}
    >
      {children}
    </Tooltip>
  );
});
