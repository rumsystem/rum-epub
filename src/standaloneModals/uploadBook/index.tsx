import { modalService } from '../modal';
import { Props } from './UploadBook';

export const uploadBook = (props: Props) => {
  const item = modalService.createModal();
  item.addModal('uploadBook', {
    destroy: item.destoryModal,
    ...props,
  });
};
