import { modalService } from '../modal';
import type { Props } from './EditProfile';

export const editProfile = (props?: Props) => {
  const item = modalService.createModal();
  item.addModal('editProfile', {
    destroy: item.destoryModal,
    ...props,
  });
};
