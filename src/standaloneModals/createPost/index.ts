import { createPromise } from '~/utils';
import { modalService } from '../modal';
import { InternalProps, Props } from './CreatePost';
import { PostRaw } from '~/service';

export const createPost = (props: Props) => {
  const item = modalService.createModal();
  const p = createPromise<PostRaw | undefined>();
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
