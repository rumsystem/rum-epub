
import React from 'react';
import { observer } from 'mobx-react-lite';

import { EpubItem, epubService, nodeService } from '~/service';
import classNames from 'classnames';

interface BookCoverImgProps extends React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> {
  className?: string
  book?: EpubItem | null
}

export const BookCoverImg = observer((props: BookCoverImgProps) => {
  const { book, ...rest } = props;
  React.useEffect(() => {
    if (props.book) {
      epubService.parseCover(nodeService.state.activeGroupId, props.book.trxId);
    }
  }, [props.book]);

  const img = props.book?.cover.type === 'loaded'
    ? props.book.cover.value
    : null;

  if (!img) {
    return null;
  }

  return (
    <img
      className={classNames(props.className)}
      src={img ?? ''}
      {...rest}
    />
  );
});
