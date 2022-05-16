
import React from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { epubService } from '~/service';

interface BookCoverImgProps extends React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> {
  className?: string
  groupId: string
  bookTrx: string
}

export const BookCoverImg = observer((props: BookCoverImgProps) => {
  const state = useLocalObservable(() => ({
    groupId: '',
    bookTrx: '',
    get img() {
      const groupItem = epubService.getGroupItem(state.groupId);
      const book = groupItem.books.find((v) => v.trxId === state.bookTrx);
      const img = book?.cover.cover || null;
      return img;
    },
  }));

  React.useEffect(() => {
    runInAction(() => {
      state.groupId = props.groupId;
      state.bookTrx = props.bookTrx;
    });
    if (props.groupId && props.bookTrx) {
      epubService.parseSubData(props.groupId, props.bookTrx);
    }
  }, [props.groupId, props.bookTrx]);

  if (!state.img) {
    return null;
  }

  const { groupId, bookTrx, ...rest } = props;
  return (
    <img
      className={classNames(props.className)}
      src={state.img ?? ''}
      {...rest}
    />
  );
});
