import { modalService } from '../modal';

export const shareGroup = (groupId: string) => {
  const item = modalService.createModal();
  item.addModal('shareGroup', {
    destroy: item.destoryModal,
    groupId,
  });
};

export const shareSeed = (seed: string) => {
  const item = modalService.createModal();
  item.addModal('shareGroup', {
    destroy: item.destoryModal,
    seed,
  });
};
