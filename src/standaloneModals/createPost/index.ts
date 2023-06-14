import { createPromise } from '~/utils';
import { Post } from '~/service';
import { modalService } from '../modal';
import type { InternalProps, Props } from './CreatePost';

export const createPost = (props: Props) => {
  const item = modalService.createModal();
  const p = createPromise<Post | undefined>();
  const internalProps: InternalProps = {
    destroy: item.destoryModal,
    rs: p.rs,
  };
  item.addModal('createPost', {
    ...props,
    ...internalProps,
  });
  return p.p;
};
