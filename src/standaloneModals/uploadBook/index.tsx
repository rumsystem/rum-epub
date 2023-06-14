import { modalService } from '../modal';
import type { Props } from './UploadBook';

export const uploadBook = (props: Props) => {
  const item = modalService.createModal();
  item.addModal('uploadBook', {
    destroy: item.destoryModal,
    ...props,
  });
};
