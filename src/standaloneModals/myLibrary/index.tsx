import { modalService } from '../modal';
import { myLibraryState } from './state';

export const myLibrary = () => {
  if (myLibraryState.closeCurrent) { myLibraryState.closeCurrent(); return; }
  const item = modalService.createModal();
  item.addModal('myLibrary', {
    destroy: item.destoryModal,
  });
};
