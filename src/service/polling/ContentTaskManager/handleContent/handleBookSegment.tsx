import { Buffer } from 'buffer';
import { utils } from 'rum-sdk-browser';
import type { IContentItem } from '~/apis';
import { dbService, BookSegment } from '~/service/db';
import { BookSegmentActivity } from '../../types';
import { hashBufferSha256 } from '~/utils';
import { combineBook } from '../combineBook';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handleBookSegment = async (options: IOptions) => {
  const { groupId, objects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    const bookIds = await db.transaction(
      'rw',
      [db.bookSegment],
      async () => {
        const items = objects.map((v) => ({
          content: v,
          activity: v.Data as any as BookSegmentActivity,
        }));

        const segments = await dbService.getBookSegment(items.map((v) => ({ groupId, trxId: v.content.TrxId })));
        const segmentsToPut: Array<BookSegment> = [];
        for (const item of items) {
          const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
          const object = item.activity.object;
          const trxId = item.content.TrxId;
          const bookId = object.attributedTo.id;
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
            bookId,
            buffer,
            sha256,
            status: 'synced',
            userAddress,
          });
        }

        await dbService.putBookSegment(segmentsToPut);
        return Array.from(new Set(segmentsToPut.map((v) => v.bookId)));
      },
    );

    combineBook(groupId, bookIds);
  } catch (e) {
    console.error(e);
  }
};
