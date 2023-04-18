import { modalService } from '../modal';

export const createGroup = () => {
  const item = modalService.createModal();
  item.addModal('createGroup', {
    destroy: item.destoryModal,
  });
};
