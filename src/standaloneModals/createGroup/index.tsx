import { createPromise } from '~/utils';
import { modalService } from '../modal';
import type { InternalProps, Props } from './CreateGroup';

export const createGroup = (props?: Props) => {
  const item = modalService.createModal();
  const p = createPromise<string | undefined>();
  const internalProps: InternalProps = {
    destroy: item.destoryModal,
    rs: p.rs,
  };
  item.addModal('createGroup', {
    ...props,
    ...internalProps,
  });
  return p.p;
};
