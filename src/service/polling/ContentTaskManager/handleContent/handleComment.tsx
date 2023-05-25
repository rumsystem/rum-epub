import { utils } from 'rum-sdk-browser';
import { runInAction } from 'mobx';
import type { IContentItem } from '~/apis';
import { Comment, dbService, Notification, PendingTrxItem, Post } from '~/service/db';
import { getHotCount, parseTime } from '~/utils';
import { nodeService } from '~/service/node';
import { linkGroupService } from '~/service/linkGroup';
import { CommentType } from '../../types';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handleComment = async (options: IOptions) => {
  const { groupId, objects, isPendingObjects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    await db.transaction('rw', [db.post, db.comment, db.notification], async () => {
      const group = nodeService.state.groups.find((v) => v.group_id === groupId)!;
      const myUserAddress = utils.pubkeyToAddress(group.user_pubkey);
      const items = objects.map((v) => ({
        content: v,
        activity: v.Data as any as CommentType,
      }));

      const replyToIds = items.map((v) => v.activity.object.inreplyto.id);
      const newCommentIds = items.map((v) => v.activity.object.id);
      const commnetIds = Array.from(new Set([...replyToIds, ...newCommentIds]));
      const comments = await dbService.getComment(commnetIds.map((v) => ({ id: v, groupId })));
      const postIds = Array.from(new Set([
        ...replyToIds,
        ...comments.map((v) => v.postId).filter((v) => v),
      ]));
      const posts = await dbService.getPost(postIds.map((v) => ({ groupId, id: v })));
      const commentToPut: Map<string, Comment> = new Map();
      const commentToAdd: Map<string, Comment> = new Map();
      const pendingTrxToAdd: Array<PendingTrxItem> = [];
      const pendingTrxToDelete: Array<Pick<PendingTrxItem, 'groupId' | 'trxId'>> = [];

      for (const item of items) {
        const object = item.activity.object;
        const id = object.id;
        const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
        const existedcomment = comments.find((v) => v.id === object.id);
        const timestamp = parseTime(item.activity.published, item.content.TimeStamp);
        if (existedcomment) {
          const updateExistedComment = existedcomment.status === 'pending'
            && existedcomment.userAddress === userAddress
            && existedcomment.trxId === item.content.TrxId;
          if (updateExistedComment) {
            existedcomment.status = 'synced';
            commentToPut.set(existedcomment.id, existedcomment);
            const commentInStore = linkGroupService.state.comment.map.get(existedcomment.id);
            if (commentInStore) {
              runInAction(() => {
                commentInStore.status = 'synced';
              });
            }
          }
          continue;
        }
        const dupeComment = commentToAdd.has(id);
        if (dupeComment) { continue; }

        const replyTo = object.inreplyto.id;
        const post = posts.find((v) => v.id === replyTo);
        const comment = comments.find((v) => v.id === replyTo) || commentToAdd.get(replyTo);

        if (!post && !comment) {
          if (!isPendingObjects) {
            pendingTrxToAdd.push({
              groupId,
              trxId: item.content.TrxId,
              value: item.content,
            });
          }
          continue;
        }

        const postId = (post?.id || comment?.postId)!;
        const threadId = comment?.threadId || comment?.id || '';
        if (isPendingObjects) {
          pendingTrxToDelete.push({
            groupId,
            trxId: item.content.TrxId,
          });
        }

        const images = item.activity.object.image
          ? [item.activity.object.image].flatMap((v) => v)
          : [];

        commentToAdd.set(id, {
          id,
          trxId: item.content.TrxId,
          title: '',
          content: object.content,
          threadId,
          groupId,
          postId,
          userAddress: utils.pubkeyToAddress(item.content.SenderPubkey),
          replyTo,
          status: 'synced',
          timestamp,
          images,
          nonAuthorCommentCount: 0,
          commentCount: 0,
          dislikeCount: 0,
          hotCount: 0,
          likeCount: 0,
          liked: false,
          disliked: false,
        });
      }

      // update post summary
      const postToPutMap = new Map<string, Post>();
      for (const [_, comment] of commentToAdd) {
        const post = postToPutMap.get(comment.postId) || posts.find((u) => comment.postId === u.id);
        if (post) {
          post.commentCount += 1;
          if (post.userAddress !== comment.userAddress) {
            post.nonAuthorCommentCount += 1;
          }
          post.hotCount = getHotCount(post);
          postToPutMap.set(post.id, post);
        }
      }

      // update thread comment summary
      const threadIds = Array.from(commentToAdd.values())
        .map((v) => v.threadId)
        .filter((v) => !!v);
      const threadComments = [
        comments.filter((v) => threadIds.includes(v.id)),
        await dbService.getComment(
          threadIds
            .filter((id) => comments.every((v) => v.id !== id))
            .map((id) => ({ id, groupId })),
        ),
      ].flatMap((v) => v);
      commentToAdd.forEach((comment) => {
        const threadComment = commentToAdd.get(comment.threadId)
          || commentToPut.get(comment.threadId)
          || threadComments.find((v) => v.id === comment.threadId);
        if (threadComment) {
          threadComment.commentCount += 1;
          if (threadComment.userAddress !== comment.userAddress) {
            threadComment.nonAuthorCommentCount += 1;
          }
          threadComment.hotCount = getHotCount(threadComment);
          if (!commentToAdd.has(threadComment.id)) {
            commentToPut.set(threadComment.id, threadComment);
          }
        }
      });

      // notifications
      const notifications: Array<Notification> = [];
      const parentCommentIds = Array.from(commentToAdd.values())
        .flatMap((v) => [v.replyTo, v.threadId]);
      const parentComments = await dbService.getComment(
        parentCommentIds.map((v) => ({ groupId, id: v })),
      );
      for (const [_, comment] of commentToAdd) {
        if (comment.userAddress === myUserAddress) { continue; }
        const post = posts.find((v) => v.id === comment.postId);
        const replyToComment = parentComments.find((v) => v.id === comment.replyTo);
        const threadComment = parentComments.find((v) => v.id === comment.threadId);
        const hasReplyNotification = replyToComment?.userAddress === myUserAddress;
        if (hasReplyNotification) {
          notifications.push({
            groupId: comment.groupId,
            objectId: comment.id,
            from: comment.userAddress,
            type: 'commentReply',
            status: 'unread',
            timestamp: comment.timestamp,
          });
        }
        const hasThreadNotification = replyToComment?.userAddress !== myUserAddress
          && threadComment?.userAddress === myUserAddress;
        if (hasThreadNotification) {
          notifications.push({
            groupId: comment.groupId,
            objectId: comment.id,
            from: comment.userAddress,
            type: 'commentReply',
            status: 'unread',
            timestamp: comment.timestamp,
          });
        }
        const hasPostNotification = post
          && post.userAddress === myUserAddress
          && comment.replyTo === post.id
          && comment.userAddress !== myUserAddress;
        if (hasPostNotification) {
          notifications.push({
            groupId: comment.groupId,
            objectId: comment.id,
            from: comment.userAddress,
            type: 'comment',
            status: 'unread',
            timestamp: comment.timestamp,
          });
        }
      }

      const postToPut = Array.from(postToPutMap.values());
      const allCommentToPut = [
        ...commentToPut.values(),
        ...commentToAdd.values(),
      ];

      await Promise.all([
        notifications.length && dbService.putNotification(notifications),
        allCommentToPut.length && dbService.putComment(allCommentToPut),
        postToPut.length && dbService.putPost(postToPut),
        pendingTrxToAdd.length && dbService.addPendingTrx(pendingTrxToAdd),
        pendingTrxToDelete.length && dbService.deletePendingTrx(pendingTrxToDelete),
      ]);

      linkGroupService.post.updateIfInStore(postToPut);
      linkGroupService.comment.updateIfInStore(allCommentToPut);
      linkGroupService.notification.addUnreadCount(notifications);
    });
  } catch (e) {
    console.error(e);
  }
};
