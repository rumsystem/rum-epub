import { modalService } from '../modal';
import { Props, InternalProps } from './ManageGroup';

export const manageGroup = (props: Props) => {
  const item = modalService.createModal();
  const internalProps: InternalProps = {
    destroy: item.destoryModal,
  };
  item.addModal('manageGroup', {
    ...props,
    ...internalProps,
  });
};
