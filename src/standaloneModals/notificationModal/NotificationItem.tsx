import { useEffect } from 'react';
import classNames from 'classnames';
import { runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button } from '@mui/material';
import { Comment, Notification, Post, linkGroupService } from '~/service';
import { lang, runLoading } from '~/utils';
import { Ago, UserAvatar, UserName } from '~/components';
import { postDetail } from '../postDetail';

export interface Props {
  notification: Notification
}
export const NotificationItem = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    loading: true,
    post: null as null | Post,
    comment: null as null | Comment,
  }));


  const loadObject = () => runLoading(
    (l) => { state.loading = l; },
    async () => {
      const { groupId, objectId } = props.notification;
      if (['comment', 'commentReply', 'commentLike'].includes(props.notification.type)) {
        const comment = await linkGroupService.comment.get(groupId, objectId);
        if (comment) {
          runInAction(() => {
            state.comment = comment;
          });
        }
      }
      if (props.notification.type === 'postLike') {
        const post = await linkGroupService.post.get(groupId, objectId);
        if (post) {
          runInAction(() => {
            state.post = post;
          });
        }
      }
    },
  );

  useEffect(() => {
    loadObject();
  }, []);

  const item = props.notification;
  const object = state.post || state.comment;

  return (
    <div className="flex-col gap-1 py-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <UserAvatar groupId={item.groupId} userAddress={item.from} size={32} />
          <UserName className="font-bold text-black/70" groupId={item.groupId} userAddress={item.from} />
        </div>
        <div className="text-black/50 text-12">
          {item.type === 'comment' && lang.notification.comment}
          {item.type === 'commentLike' && lang.notification.commentLike}
          {item.type === 'commentReply' && lang.notification.commentReply}
          {item.type === 'postLike' && lang.notification.postLike}
          <Ago className="text-black/30 text-12 ml-2" timestamp={item.timestamp} />
        </div>
      </div>
      <div className="pl-10">
        {!!object && (
          <div
            className={classNames(
              'text-black/60 break-all',
              (item.type === 'commentLike' || item.type === 'postLike') && 'border-l-[3px] pl-2 border-black/15',
            )}
          >
            {object.content}
            rum://seed?v=1&e=0&n=0&c=HYSeBsmhiti38I9AUd5YNOL0o3HR5e2cgKLHlgoTp_s&g=VKnkr_KgRYCLSWAPhNZfYQ&k=Audc_NN3hmnBf4IUwJkqZ8aJbZxWWDTQ4uZN28aVC-NY&s=xMprovvdsm5ijMA6eHdjYldQz-s5TeIWkqEXnHl5lLMTgRP_3FDbYNO0vRZNkEAzecYTGonHmI7ugFM6gZhf8gE&t=F2Pqx2p1OSg&a=epubtest&y=group_epub&u=
          </div>
        )}
      </div>
      {!!object && (
        <div className="pl-10 pt-1 -ml-2">
          <Button
            className="text-12 px-2 font-default font-normal text-black/40 leading-normal min-w-0"
            variant="text"
            size="small"
            onClick={() => postDetail({
              groupId: object.groupId,
              postId: 'postId' in object ? object.postId : object.id,
              locateComment: 'postId' in object ? object.id : undefined,
            })}
          >
            {lang.notification.clickToView}
          </Button>
        </div>
      )}
    </div>
  );
});
