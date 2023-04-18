import { Buffer } from 'buffer';
import { utils } from 'rum-sdk-browser';
import type { IContentItem } from '~/apis';
import { dbService, CoverSegment } from '~/service/db';
import { CoverSegmentActivity } from '../../types';
import { hashBufferSha256 } from '~/utils';
import { combineCover } from '../combineCover';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handleCoverSegment = async (options: IOptions) => {
  const { groupId, objects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    const coverIds = await db.transaction(
      'rw',
      [db.coverSegment],
      async () => {
        const items = objects.map((v) => ({
          content: v,
          activity: v.Data as any as CoverSegmentActivity,
        }));

        const segments = await dbService.getCoverSegment(items.map((v) => ({ groupId, trxId: v.content.TrxId })));
        const segmentsToPut: Array<CoverSegment> = [];
        for (const item of items) {
          const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
          const object = item.activity.object;
          const trxId = item.content.TrxId;
          const coverId = object.attributedTo.id;
          const buffer = Buffer.from(object.content, 'base64');
          const sha256 = hashBufferSha256(buffer);

          const existedSegment = segments.find((v) => v.trxId === trxId);
          if (existedSegment) {
            const updateExistedSegment = existedSegment.status === 'pending'
            && existedSegment.userAddress === userAddress
            && existedSegment.trxId === item.content.TrxId;
            if (updateExistedSegment) {
              existedSegment.status = 'synced';
              segmentsToPut.push(existedSegment);
            }
            continue;
          }
          segmentsToPut.push({
            trxId,
            groupId,
            coverId,
            buffer,
            sha256,
            status: 'synced',
            userAddress,
          });
        }

        await dbService.putCoverSegment(segmentsToPut);
        return Array.from(new Set(segmentsToPut.map((v) => v.coverId)));
      },
    );

    combineCover(groupId, coverIds);
  } catch (e) {
    console.error(e);
  }
};
