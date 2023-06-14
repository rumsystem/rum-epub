import { modalService } from '../modal';
import type { InternalProps, Props } from './PostDetail';

export const postDetail = (props: Props) => {
  const item = modalService.createModal();
  const internalProps: InternalProps = {
    destroy: item.destoryModal,
  };
  item.addModal('postDetail', {
    ...props,
    ...internalProps,
  });
};
