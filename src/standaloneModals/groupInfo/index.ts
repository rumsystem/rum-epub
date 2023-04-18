import { modalService } from '../modal';
import { Props } from './GroupInfo';

export const groupInfo = (props: Props) => {
  const item = modalService.createModal();
  item.addModal('groupInfo', {
    destroy: item.destoryModal,
    ...props,
  });
};
