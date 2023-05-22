import { useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button } from '@mui/material';

import { RiMoreFill, RiThumbUpFill, RiThumbUpLine } from 'react-icons/ri';
import { FaRegComment } from 'react-icons/fa';

import { CommentRaw, linkGroupService } from '~/service';
import { Ago, ContentSyncStatus, UserAvatar, UserName } from '~/components';
import { ObjectMenu } from '../../../ObjectMenu';
import { lang } from '~/utils';

interface Props {
  className?: string
  comment: CommentRaw
  replyTo?: CommentRaw
  onReplyClick?: () => unknown
  onReplyToClick?: () => unknown
}

export const CommentItem = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    menu: false,
  }));
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const comment = props.comment;

  const handleClickUser = () => linkGroupService.post.list({
    groupId: props.comment.groupId,
    userAddress: props.comment.userAddress,
    order: 'time',
  });

  return (
    <div
      className={classNames(
        'flex gap-3 bg-white',
        props.className,
      )}
    >
      <UserAvatar onClick={handleClickUser} groupId={comment.groupId} userAddress={comment.userAddress} size={36} />
      <div className="flex-col gap-1 mt-1 flex-1">
        <div className="flex items-center gap-3 relative">
          <span className="text-black/60 font-bold" onClick={handleClickUser}>
            <UserName groupId={comment.groupId} userAddress={comment.userAddress} />
          </span>
          <span className="text-black/40">
            <Ago timestamp={comment.timestamp} />
          </span>
          {!!props.replyTo && !!props.replyTo.threadId && (
            <button
              className="text-black/40 hover:text-black/90"
              onClick={props.onReplyToClick}
            >
              {lang.linkGroup.replyTo}&nbsp;
              <UserName groupId={props.replyTo.groupId} userAddress={props.replyTo.userAddress} />
            </button>
          )}
        </div>

        {!!comment.content && (
          <div className="">
            {comment.content}
          </div>
        )}

        <div className="flex gap-2 relative -left-2 mt-[2px]">
          <Button
            className="flex items-center gap-[6px] px-2 py-[2px] text-black/25 hover:text-black/80 min-w-0"
            variant="text"
            size="small"
            onClick={() => linkGroupService.counter.update(comment, comment.liked ? 'undolike' : 'like')}
          >
            <div className="text-16">
              {comment.liked && <RiThumbUpFill />}
              {!comment.liked && <RiThumbUpLine />}
            </div>
            {!!comment.likeCount && (
              <span className="leading-none">
                {comment.likeCount}
              </span>
            )}
          </Button>

          <Button
            className="flex items-center gap-[6px] px-2 py-[2px] text-black/25 hover:text-black/80 min-w-0"
            variant="text"
            size="small"
            onClick={() => props.onReplyClick?.()}
          >
            <div className="text-16">
              <FaRegComment />
            </div>
            {/* {!!comment.commentCount && (
              <span className="leading-none">
                {comment.commentCount}
              </span>
            )} */}
          </Button>

          {comment.status === 'synced' && (
            <Button
              className="flex items-center gap-[6px] px-2 py-[2px] text-black/25 hover:text-black/80 min-w-0"
              variant="text"
              size="small"
              ref={menuButtonRef}
              onClick={action(() => { state.menu = !state.menu; })}
            >
              <RiMoreFill className="text-18" />
            </Button>
          )}

          <ContentSyncStatus className="px-2" synced={comment.status === 'synced'} />

          <ObjectMenu
            open={state.menu}
            anchor={menuButtonRef.current}
            object={comment}
            onClose={action(() => { state.menu = false; })}
          />
        </div>
      </div>
    </div>
  );
});
