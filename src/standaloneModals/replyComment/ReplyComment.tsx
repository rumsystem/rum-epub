import { useMemo } from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { utils } from 'rum-sdk-browser';
import { Dialog, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import { CommentRaw, PostRaw, linkGroupService, nodeService } from '~/service';
import { lang, runLoading } from '~/utils';
import { Ago, UserAvatar, UserName } from '~/components';

export interface Props {
  post: PostRaw
  comment: CommentRaw
}
export interface InternalProps {
  destroy: () => unknown
  rs: (post?: CommentRaw) => unknown
}
export const ReplyComment = observer((props: InternalProps & Props) => {
  const state = useLocalObservable(() => ({
    content: '',
    open: true,
    loading: false,
  }));

  const handleClose = action(() => {
    state.open = false;
    props.rs();
    setTimeout(action(() => {
      props.destroy();
    }), 2000);
  });

  const handleSubmit = () => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const comment = await linkGroupService.comment.create({
          groupId: props.comment.groupId,
          post: props.post,
          comment: props.comment,
          content: state.content,
        });
        props.rs(comment);
        handleClose();
      },
    );
  };

  const comment = props.comment;
  const groupId = props.comment.groupId;
  const myUserAddress = useMemo(() => {
    const pubkey = nodeService.state.groupMap[groupId]?.user_pubkey;
    if (!pubkey) { return ''; }
    return utils.pubkeyToAddress(pubkey);
  }, [groupId]);

  return (
    <Dialog open={state.open} onClose={handleClose}>
      <div className="flex-col gap-4 bg-white rounded-0 p-6">
        <div className="text-18 font-bold text-gray-700 text-center">
          reply comment
        </div>

        <div className="flex gap-3 bg-white">
          <UserAvatar groupId={comment.groupId} userAddress={comment.userAddress} size={36} />
          <div className="flex-col gap-1 mt-[2px] flex-1">
            <div className="flex items-center gap-3 relative">
              <span className="text-black/60 font-bold">
                <UserName groupId={comment.groupId} userAddress={comment.userAddress} />
              </span>
              <span className="text-black/40">
                <Ago timestamp={comment.timestamp} />
              </span>
            </div>

            {!!comment.content && (
              <div className="">
                {comment.content}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <UserAvatar className="flex-none" groupId={groupId} userAddress={myUserAddress} size={36} />

          <TextField
            className="w-[400px]"
            inputProps={{ className: 'text-14' }}
            value={state.content}
            placeholder={lang.linkGroup.replyPlaceHolder}
            multiline
            minRows={3}
            maxRows={6}
            size="small"
            onChange={action((e) => { state.content = e.target.value; })}
          />
        </div>

        <div className="flex justify-end">
          <LoadingButton
            variant="contained"
            onClick={handleSubmit}
            loading={state.loading}
          >
            {lang.linkGroup.reply}
          </LoadingButton>
        </div>
      </div>
    </Dialog>
  );
});
