import { modalService } from '../modal';
import { Props } from './EditEpubMetadata';

export const editEpubMetadata = (props: Props) => {
  const item = modalService.createModal();
  item.addModal('editEpubMetadata', {
    destroy: item.destoryModal,
    ...props,
  });
};
