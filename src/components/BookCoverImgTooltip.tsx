import React from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Tooltip, TooltipProps } from '@mui/material';

import { bookService } from '~/service';

interface BookCoverImgProps extends Omit<TooltipProps, 'title'> {
  children: React.ReactElement
  groupId: string
  bookId: string
}

export const BookCoverImgTooltip = observer((props: BookCoverImgProps) => {
  const state = useLocalObservable(() => ({
    open: false,
    url: '',
  }));

  const handleOpen = action(() => {
    state.open = true;
  });

  const handleClose = action(() => {
    state.open = false;
  });

  React.useEffect(() => {
    let newUrl = '';
    const item = bookService.state.groupMap.get(groupId)?.find((v) => v.book.id === props.bookId);
    const buffer = item?.cover?.file;
    if (buffer) {
      newUrl = URL.createObjectURL(new Blob([buffer]));
      runInAction(() => {
        state.url = newUrl;
      });
    }
    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [props.groupId, props.bookId]);

  const { groupId, bookId, children, ...rest } = props;
  return (
    <Tooltip
      classes={{
        tooltip: 'bg-transparent',
      }}
      open={state.open && !!state.url}
      onOpen={handleOpen}
      onClose={handleClose}
      disableInteractive
      title={(
        <img
          className="shadow-4 rounded"
          src={state.url}
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
