import { modalService } from '../modal';

export const joinGroup = () => {
  const item = modalService.createModal();
  item.addModal('joinGroup', {
    destroy: item.destoryModal,
  });
};
