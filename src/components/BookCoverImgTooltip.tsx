
import React from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Tooltip, TooltipProps } from '@mui/material';

import { EpubItem, epubService } from '~/service/epub';
import { nodeService } from '~/service/node';

interface BookCoverImgProps extends Omit<TooltipProps, 'title'> {
  book?: EpubItem | null
  children: React.ReactElement
}

export const BookCoverImgTooltip = observer((props: BookCoverImgProps) => {
  const state = useLocalObservable(() => ({
    open: false,
  }));
  const { book, children, ...rest } = props;

  const handleOpen = action(() => {
    if (book) {
      epubService.parseCover(nodeService.state.activeGroupId, book.trxId);
    }
    state.open = true;
  });

  const handleClose = action(() => {
    state.open = false;
  });

  const img = book?.cover.type === 'loaded'
    ? book.cover.value
    : null;

  return (
    <Tooltip
      classes={{
        tooltip: 'bg-transparent',
      }}
      open={state.open && !!img}
      onOpen={handleOpen}
      onClose={handleClose}
      disableInteractive
      title={(
        <img
          className="shadow-4 rounded"
          src={img ?? ''}
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
