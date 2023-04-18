import { utils } from 'rum-sdk-browser';
import type { IContentItem } from '~/apis';
import { dbService, CoverSummary } from '~/service/db';
import { parseTime } from '~/utils';
import { CoverSummaryActivity, CoverSummaryContent } from '../../types';
import { combineCover } from '../combineCover';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handleCover = async (options: IOptions) => {
  const { groupId, objects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    const coverIds = await db.transaction(
      'rw',
      [db.cover],
      async () => {
        const items = objects.map((v) => ({
          content: v,
          activity: v.Data as any as CoverSummaryActivity,
        }));

        const covers = await dbService.getCover(items.map((v) => ({ groupId, coverId: v.activity.object.id })));
        const newCoverIds: Array<string> = [];
        const coversToPut: Array<CoverSummary> = [];
        for (const item of items) {
          const object = item.activity.object;
          const id = object.id;
          const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
          const existedCover = covers.find((v) => v.id === object.id);
          if (existedCover) {
            const updateExistedCover = existedCover.status === 'pending'
              && existedCover.userAddress === userAddress
              && existedCover.trxId === item.content.TrxId;
            if (updateExistedCover) {
              existedCover.status = 'synced';
              coversToPut.push(existedCover);
            }
            continue;
          }
          const dupeCover = coversToPut.find((v) => v.id === id);
          if (dupeCover) { continue; }
          const metadata: CoverSummaryContent = JSON.parse(item.activity.object.content);
          const timestamp = parseTime(item.activity.published, item.content.TimeStamp);
          newCoverIds.push(id);
          coversToPut.push({
            id,
            groupId,
            trxId: item.content.TrxId,
            bookId: metadata.bookId,
            timestamp,
            size: metadata.size,
            complete: false,
            segments: metadata.segments.map((sha256) => ({ sha256 })),
            sha256: metadata.sha256,
            status: 'synced',
            userAddress,
          });
        }

        await dbService.putCover(coversToPut);
        return newCoverIds;
      },
    );
    combineCover(groupId, coverIds);
  } catch (e) {
    console.error(e);
  }
};
