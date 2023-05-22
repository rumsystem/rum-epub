import { createPromise } from '~/utils';
import { CommentRaw } from '~/service';
import { modalService } from '../modal';
import { InternalProps, Props } from './ReplyComment';

export const replyComment = (props: Props) => {
  const item = modalService.createModal();
  const p = createPromise<CommentRaw | undefined>();
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
