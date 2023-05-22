import { modalService } from '../modal';
import { Props } from './GroupLink';

export const groupLink = (props: Props) => {
  const item = modalService.createModal();
  item.addModal('groupLink', {
    destroy: item.destoryModal,
    ...props,
  });
};
