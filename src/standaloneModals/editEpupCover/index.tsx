import { modalService } from '../modal';
import type { Props } from './EditEpupCover';

export const editEpubCover = (props: Props) => {
  if (!props.bookId) {
    return;
  }
  const item = modalService.createModal();
  item.addModal('editEpubCover', {
    destroy: item.destoryModal,
    ...props,
  });
};
