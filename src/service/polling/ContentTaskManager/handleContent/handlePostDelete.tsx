import { utils } from 'rum-sdk-browser';
import type { IContentItem } from '~/apis';
import { dbService, PendingTrxItem } from '~/service/db';
import { PostDeleteType } from '../../types';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handlePostDelete = async (options: IOptions) => {
  const { groupId, objects, isPendingObjects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    await db.transaction('rw', [db.post], async () => {
      const items = objects.map((v) => ({
        content: v,
        activity: v.Data as any as PostDeleteType,
      }));

      const posts = await dbService.getPost(items.map((v) => ({ groupId, id: v.activity.object.id })));
      const postToDelete = new Set<string>();
      const pendingTrxToAdd: Array<PendingTrxItem> = [];
      const pendingTrxToDelete: Array<Pick<PendingTrxItem, 'groupId' | 'trxId'>> = [];

      for (const item of items) {
        const object = item.activity.object;
        const id = object.id;
        const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
        const existedPost = posts.find((v) => v.id === id);

        if (!existedPost) {
          if (!isPendingObjects) {
            pendingTrxToAdd.push({
              groupId,
              trxId: item.content.TrxId,
              value: item.content,
            });
          }
          continue;
        }

        if (isPendingObjects) {
          pendingTrxToDelete.push({
            groupId,
            trxId: item.content.TrxId,
          });
        }

        if (existedPost.userAddress === userAddress) {
          postToDelete.add(id);
        }
      }

      await Promise.all([
        dbService.deletePost(groupId, Array.from(postToDelete)),
        pendingTrxToAdd.length && dbService.addPendingTrx(pendingTrxToAdd),
        pendingTrxToDelete.length && dbService.deletePendingTrx(pendingTrxToDelete),
      ]);
    });
  } catch (e) {
    console.error(e);
  }
};
