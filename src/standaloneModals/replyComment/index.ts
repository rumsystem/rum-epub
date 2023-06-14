import { createPromise } from '~/utils';
import { Comment } from '~/service';
import { modalService } from '../modal';
import type { InternalProps, Props } from './ReplyComment';

export const replyComment = (props: Props) => {
  const item = modalService.createModal();
  const p = createPromise<Comment | undefined>();
  const internalProps: InternalProps = {
    destroy: item.destoryModal,
    rs: p.rs,
  };
  item.addModal('replyComment', {
    ...props,
    ...internalProps,
  });
  return p.p;
};
