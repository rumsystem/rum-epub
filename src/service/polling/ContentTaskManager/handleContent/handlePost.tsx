import { utils } from 'rum-sdk-browser';
import { runInAction } from 'mobx';
import type { IContentItem } from '~/apis';
import { dbService, Post } from '~/service/db';
import { linkGroupService } from '~/service/linkGroup';
import { parseTime } from '~/utils';
import { PostType } from '../../types';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handlePost = async (options: IOptions) => {
  const { groupId, objects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    await db.transaction('rw', [db.post], async () => {
      const items = objects.map((v) => ({
        content: v,
        activity: v.Data as any as PostType,
      }));

      const posts = await dbService.getPost(items.map((v) => ({ groupId, id: v.activity.object.id })));
      const postToPut: Array<Post> = [];
      for (const item of items) {
        const object = item.activity.object;
        const id = object.id;
        const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
        const existedPost = posts.find((v) => v.id === object.id);
        const timestamp = parseTime(item.activity.published, item.content.TimeStamp);
        if (existedPost) {
          const updateExistedPost = existedPost.status === 'pending'
            && existedPost.userAddress === userAddress
            && existedPost.trxId === item.content.TrxId;
          if (updateExistedPost) {
            existedPost.status = 'synced';
            postToPut.push(existedPost);
            const postInStore = linkGroupService.state.post.map.get(existedPost.id);
            if (postInStore) {
              runInAction(() => {
                postInStore.status = 'synced';
              });
            }
          }
          continue;
        }
        const dupePost = postToPut.find((v) => v.id === id);
        if (dupePost) { continue; }
        const images = item.activity.object.image
          ? [item.activity.object.image].flatMap((v) => v)
          : [];
        postToPut.push({
          id,
          groupId,
          trxId: item.content.TrxId,
          timestamp,
          bookId: object.bookId ?? '',
          chapter: object.chapter ?? '',
          chapterId: object.chapterId ?? '',
          quote: object.quote ?? '',
          quoteRange: object.quoteRange ?? '',
          content: object.content,
          title: object.name ?? '',
          commentCount: 0,
          nonAuthorCommentCount: 0,
          dislikeCount: 0,
          hotCount: 0,
          likeCount: 0,
          images,
          status: 'synced',
          userAddress,
          liked: false,
          disliked: false,
        });
      }

      await dbService.putPost(postToPut);
    });
  } catch (e) {
    console.error(e);
  }
};
