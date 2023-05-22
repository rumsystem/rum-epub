import { useEffect } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { utils } from 'rum-sdk-browser';
import { CircularProgress, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import { CommentRaw, linkGroupService, nodeService, PostRaw } from '~/service';
import { lang, notNullFilter, runLoading, sleep } from '~/utils';
import { replyComment } from '~/standaloneModals';
import { UserAvatar } from '~/components';
import { CommentItem } from './CommentItem';

interface Props {
  className?: string
  post: PostRaw
  open: boolean
}

export const PostCommentSection = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    input: '',
    commentIds: [] as Array<string>,
    loading: true,
    submitting: false,
    showSubmitButton: false,
    get comments() {
      return this.commentIds
        .map((id) => linkGroupService.state.comment.map.get(id))
        .filter(notNullFilter);
    },
    get myUserAddress() {
      const pubkey = nodeService.state.groups.find((v) => v.group_id === props.post.groupId)?.user_pubkey;
      if (!pubkey) { return ''; }
      return utils.pubkeyToAddress(pubkey);
    },
  }));

  const loadComments = () => {
    const run = async () => {
      const comments = await linkGroupService.comment.list({
        groupId: props.post.groupId,
        postId: props.post.id,
        order: 'time',
        offset: 0,
        limit: 500,
      });
      runInAction(() => {
        state.commentIds = comments.map((v) => v.id);
      });
    };
    runLoading(
      (l) => { state.loading = l; },
      () => Promise.all([
        run(),
        sleep(300),
      ]),
    );
  };

  const handlePostComment = () => {
    runLoading(
      (l) => { state.submitting = l; },
      async () => {
        const comment = await linkGroupService.comment.create({
          groupId: props.post.groupId,
          post: props.post,
          content: state.input,
        });
        if (comment) {
          runInAction(() => {
            state.input = '';
            state.commentIds.unshift(comment.id);
          });
        }
      },
    );
  };

  const handleReplyComment = async (comment: CommentRaw) => {
    const newComment = await replyComment({ post: props.post, comment });
    if (newComment) {
      state.commentIds.unshift(newComment.id);
    }
  };

  useEffect(action(() => {
    if (props.open) {
      loadComments();
    } else {
      state.showSubmitButton = false;
      state.loading = true;
    }
  }), [props.open]);

  if (!props.open) {
    return null;
  }

  return (
    <div
      className={classNames(
        'flex-col items-stretch gap-4 bg-white',
        props.className,
      )}
    >
      {state.loading && (
        <div className="flex flex-center">
          <CircularProgress className="text-black/20" size={36} />
        </div>
      )}
      {!state.loading && (<>
        <div className="flex gap-4">
          <div className="flex flex-center h-10 flex-none">
            <UserAvatar className="flex-none" groupId={props.post.groupId} userAddress={state.myUserAddress} size={36} />
          </div>
          <TextField
            className="flex-1 min-h-[40px]"
            inputProps={{ className: 'text-14' }}
            multiline
            minRows={1}
            maxRows={5}
            placeholder={lang.linkGroup.commentPlaceHolder}
            onFocus={action(() => { state.showSubmitButton = true; })}
            size="small"
            value={state.input}
            onChange={action((e) => { state.input = e.target.value; })}
          />
        </div>

        {state.showSubmitButton && (
          <div className="flex justify-end border-b pb-3">
            <LoadingButton
              onClick={handlePostComment}
              loading={state.submitting}
              variant="contained"
              size="small"
            >
              {lang.linkGroup.publish}
            </LoadingButton>
          </div>
        )}

        <div className="flex-col gap-4 items-stretch">
          {state.comments.filter((v) => !v.threadId).map((comment) => (
            <div key={comment.id}>
              <CommentItem
                onReplyClick={() => handleReplyComment(comment)}
                comment={comment}
              />
              {!!state.comments.filter((u) => u.threadId === comment.id).length && (
                <div className="flex-col mt-4 gap-4 ml-11 border-l-2 border-black/8 pl-2">
                  {state.comments.filter((u) => u.threadId === comment.id).map((childComment) => (
                    <CommentItem
                      key={childComment.id}
                      onReplyClick={() => handleReplyComment(childComment)}
                      comment={childComment}
                      replyTo={state.comments.find((v) => v.id === childComment.replyTo)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
});
