
import React from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { action, reaction, runInAction } from 'mobx';
import { bookService } from '~/service';

interface BookCoverImgProps extends Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'children'> {
  className?: string
  groupId: string
  bookId: string
  children?: (src: string) => React.ReactElement | null
}

const cacheMap = new Map<Uint8Array, { url: string, count: number }>();

(window as any).cacheMap = cacheMap;

export const BookCoverImg = observer((props: BookCoverImgProps) => {
  const state = useLocalObservable(() => ({
    url: '',
    dispose: (() => {}) as () => unknown,
  }));

  const createDispose = (file: Uint8Array) => () => {
    const item = cacheMap.get(file);
    if (item) {
      item.count -= 1;
      if (!item.count) {
        URL.revokeObjectURL(item.url);
        cacheMap.delete(file);
      }
    }
    runInAction(() => {
      state.dispose = () => {};
    });
  };

  const clearUrl = action(() => {
    if (state.url) {
      state.url = '';
    }
  });

  const createUrl = () => {
    state.dispose();
    const file = bookService.state.groupMap.get(props.groupId ?? '')
      ?.find((v) => v.book.id === props.bookId)
      ?.cover?.file;


    if (!file) {
      clearUrl();
      return;
    }

    const item = cacheMap.get(file);
    if (item) {
      runInAction(() => { state.url = item.url; });
      item.count += 1;
      state.dispose = createDispose(file);
      return;
    }

    const url = URL.createObjectURL(new Blob([file]));
    runInAction(() => { state.url = url; });
    const newItem = { url, count: 1 };
    cacheMap.set(file, newItem);
    state.dispose = createDispose(file);
  };

  React.useEffect(() => reaction(
    () => bookService.state.groupMap.get(props.groupId ?? '')?.find((v) => v.book.id === props.bookId)?.cover,
    createUrl,
    { fireImmediately: true },
  ), [props.groupId, props.bookId]);

  React.useEffect(() => () => {
    state.dispose();
  }, []);

  const { children, groupId, bookId, ...rest } = props;

  if (children) {
    return children(state.url);
  }
  return (
    <img
      src={state.url}
      {...rest}
    />
  );
});
