import { utils } from 'rum-sdk-browser';
import type { IContentItem } from '~/apis';
import { Comment, Counter, dbService, Notification, PendingTrxItem, Post } from '~/service/db';
import { getHotCount, parseTime } from '~/utils';
import { nodeService } from '~/service/node';
import { linkGroupService } from '~/service/linkGroup';
import { CounterType } from '../../types';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handleCounter = async (options: IOptions) => {
  const { groupId, objects, isPendingObjects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;
  const group = nodeService.state.groups.find((v) => v.group_id === groupId)!;
  const myUserAddress = utils.pubkeyToAddress(group.user_pubkey);

  try {
    await db.transaction('rw', [db.counter, db.post, db.comment, db.notification, db.pendingTrx], async () => {
      const items = objects.map((v) => ({
        content: v,
        activity: v.Data as any as CounterType,
      }));

      const objectIds = items.map((v) => {
        const id = v.activity.type === 'Undo'
          ? v.activity.object.object.id
          : v.activity.object.id;
        return id;
      });
      const posts = await dbService.getPost(
        objectIds.map((v) => ({ id: v, groupId })),
      );

      const comments = await dbService.getComment(
        objectIds.map((v) => ({ groupId, id: v })),
      );
      const existedCounters = await dbService.getCounter(
        items.map((v) => ({
          trxId: v.content.TrxId,
          groupId,
        })),
      );

      const postsToPutMap = new Map<string, Post>();
      const commentsToPutMap = new Map<string, Comment>();
      const countersToPut: Array<Counter> = [];
      const countersToAdd: Array<Counter> = [];
      const notifications: Array<Notification> = [];
      const pendingTrxToAdd: Array<PendingTrxItem> = [];
      const pendingTrxToDelete: Array<Pick<PendingTrxItem, 'groupId' | 'trxId'>> = [];

      for (const item of items) {
        const timestamp = parseTime(item.activity.published, item.content.TimeStamp);
        const existedCounter = [...existedCounters, ...countersToAdd].find((v) => v.trxId === item.content.TrxId);
        const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);

        if (existedCounter) {
          const updateExistedCounter = existedCounter.status === 'pending'
            && existedCounter.userAddress === userAddress
            && existedCounter.trxId === item.content.TrxId;
          if (updateExistedCounter) {
            existedCounter.status = 'synced';
            countersToPut.push(existedCounter);
          }
          continue;
        }

        const objectId = item.activity.type === 'Undo'
          ? item.activity.object.object.id
          : item.activity.object.id;
        const post = posts.find((v) => v.id === objectId);
        const comment = comments.find((v) => v.id === objectId);
        if (!post && !comment) {
          pendingTrxToAdd.push({
            groupId,
            trxId: item.content.TrxId,
            value: item.content,
          });
          continue;
        }

        const object = post ?? comment!;
        const objectType = post ? 'post' : 'comment';
        let counterType: Counter['type'] = 'like';
        const updateObjectCounter = (key: 'likeCount' | 'dislikeCount', delta: number) => {
          object[key] += delta;
          object.hotCount = getHotCount(object);
        };
        if (item.activity.type === 'Like') {
          counterType = 'like';
          if (userAddress === myUserAddress) { object.liked = true; }
          updateObjectCounter('likeCount', 1);
        }
        if (item.activity.type === 'Dislike') {
          counterType = 'dislike';
          if (userAddress === myUserAddress) { object.disliked = true; }
          updateObjectCounter('dislikeCount', 1);
        }
        if (item.activity.type === 'Undo') {
          if (item.activity.object.type === 'Like') {
            counterType = 'undolike';
            if (userAddress === myUserAddress) { object.liked = false; }
            updateObjectCounter('likeCount', -1);
          }
          if (item.activity.object.type === 'Dislike') {
            counterType = 'undodislike';
            if (userAddress === myUserAddress) { object.disliked = false; }
            updateObjectCounter('dislikeCount', -1);
          }
        }

        // notification (like activity only)
        const sendNotification = object.userAddress === myUserAddress
          && userAddress !== myUserAddress
          && item.activity.type === 'Like';
        if (sendNotification) {
          notifications.push({
            from: userAddress,
            groupId,
            objectId,
            status: 'unread',
            timestamp,
            type: objectType === 'post' ? 'postLike' : 'commentLike',
          });
        }

        if (isPendingObjects) {
          pendingTrxToDelete.push({
            groupId,
            trxId: item.content.TrxId,
          });
        }

        countersToAdd.push({
          trxId: item.content.TrxId,
          groupId,
          objectId,
          objectType,
          status: 'synced',
          type: counterType,
          userAddress: utils.pubkeyToAddress(item.content.SenderPubkey),
          timestamp,
        });

        if (post) { postsToPutMap.set(post.id, post); }
        if (comment) { commentsToPutMap.set(comment.id, comment); }
      }

      const postToPut = Array.from(postsToPutMap.values());
      const commentsToPut = Array.from(commentsToPutMap.values());

      await Promise.all([
        dbService.putCounter([...countersToAdd, ...countersToPut]),
        dbService.putPost(postToPut),
        dbService.putComment(commentsToPut),
        dbService.putNotification(notifications),
        dbService.addPendingTrx(pendingTrxToAdd),
        dbService.deletePendingTrx(pendingTrxToDelete),
      ]);

      linkGroupService.post.updateIfInStore(postToPut);
      linkGroupService.comment.updateIfInStore(commentsToPut);
      linkGroupService.notification.addUnreadCount(notifications);
    });
  } catch (e) {
    console.error(e);
  }
};
