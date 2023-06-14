import { useRef, useContext, useEffect } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import scrollIntoView from 'scroll-into-view-if-needed';
import { Button } from '@mui/material';

import { RiMoreFill, RiThumbUpFill, RiThumbUpLine } from 'react-icons/ri';
import { FaRegComment } from 'react-icons/fa';

import { Comment, linkGroupService } from '~/service';
import { Ago, ContentSyncStatus, UserAvatar, UserName, ObjectMenu } from '~/components';
import { lang } from '~/utils';
import { locateCommentContext } from './locateComment';

interface Props {
  className?: string
  comment: Comment
  replyTo?: Comment
  onReplyClick?: () => unknown
  onReplyToClick?: () => unknown
  myUserAddress?: string
}

export const CommentItem = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    menu: false,
    highlight: false,
  }));
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const comment = props.comment;

  const handleClickUser = () => linkGroupService.post.list({
    groupId: props.comment.groupId,
    userAddress: props.comment.userAddress,
    order: 'time',
  });

  const context = useContext(locateCommentContext);

  useEffect(action(() => {
    if (context.commentId) {
      if (context.commentId === props.comment.id) {
        state.highlight = true;
        context.commentId = '';
        scrollIntoView(boxRef.current!, {
          behavior: 'smooth',
        });
      } else {
        state.highlight = false;
      }
    }
  }), []);

  return (
    <div
      className={classNames(
        'flex gap-3 bg-white duration-300 transition-all outline outline-transparent',
        state.highlight && 'bg-sky-300/15 !outline-sky-500/40',
        props.className,
      )}
      onClick={action(() => { state.highlight = false; })}
      ref={boxRef}
    >
      <UserAvatar onClick={handleClickUser} groupId={comment.groupId} userAddress={comment.userAddress} size={36} />
      <div className="flex-col gap-1 mt-1 flex-1">
        <div className="flex items-center gap-3 relative">
          <span
            className={classNames(
              'font-bold text-black/60',
              comment.userAddress === props.myUserAddress && 'bg-black/60 px-[6px] rounded text-white',
            )}
            onClick={handleClickUser}
          >
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
            hideOpenPostDetail
          />
        </div>
      </div>
    </div>
  );
});
