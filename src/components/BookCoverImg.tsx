
import React from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { epubService } from '~/service';
import { runInAction } from 'mobx';

interface BookCoverImgProps extends Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'children'> {
  className?: string
  groupId: string
  bookTrx: string
  children?: (src: string) => React.ReactElement
}

export const BookCoverImg = observer((props: BookCoverImgProps) => {
  const state = useLocalObservable(() => ({
    groupId: props.groupId,
    bookTrx: props.bookTrx,
    get img() {
      if (!this.groupId) { return null; }
      const groupItem = epubService.getGroupItem(this.groupId);
      const book = groupItem.books.find((v) => v.trxId === this.bookTrx);
      const img = book?.cover || null;
      return img;
    },
  }));

  React.useEffect(() => {
    if (!state.img && props.groupId && props.bookTrx) {
      epubService.parseMetadataAndCover(props.groupId, props.bookTrx);
    }
    runInAction(() => {
      state.groupId = props.groupId;
      state.bookTrx = props.bookTrx;
    });
  }, [props.groupId, props.bookTrx]);

  const { groupId, bookTrx, children, ...rest } = props;
  if (children) {
    return children(state.img ?? '');
  }
  if (!state.img) {
    return null;
  }
  return (
    <img
      className={classNames(props.className)}
      src={state.img ?? ''}
      {...rest}
    />
  );
});
