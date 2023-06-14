import { modalService } from '../modal';
import type { InternalProps, Props } from './TrxInfo';

export const trxInfo = (props: Props) => {
  const item = modalService.createModal();
  const internalProps: InternalProps = {
    destroy: item.destoryModal,
  };
  item.addModal('trxInfo', {
    ...props,
    ...internalProps,
  });
};
