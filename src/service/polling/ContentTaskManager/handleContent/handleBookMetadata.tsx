import { utils } from 'rum-sdk-browser';
import type { IContentItem } from '~/apis';
import { dbService, BookMetadata } from '~/service/db';
import { EpubMetadata, parseTime } from '~/utils';
import { BookMetadataActivity } from '../../types';
import { bookService } from '~/service/book';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handleBookMetadata = async (options: IOptions) => {
  const { groupId, objects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    await db.transaction(
      'rw',
      [db.bookMetadata],
      async () => {
        const items = objects.map((v) => ({
          content: v,
          activity: v.Data as any as BookMetadataActivity,
        }));

        const metadatas = await dbService.getBookMetadataByTrxId(items.map((v) => ({ groupId, trxId: v.content.TrxId })));
        const metadataToPut: Array<BookMetadata> = [];
        for (const item of items) {
          const object = item.activity.object;
          const trxId = item.content.TrxId;
          const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
          const existedItem = metadatas.find((v) => v.trxId === item.content.TrxId);
          if (existedItem) {
            const updateExistedItem = existedItem.status === 'pending'
              && existedItem.userAddress === userAddress
              && existedItem.trxId === item.content.TrxId;
            if (updateExistedItem) {
              existedItem.status = 'synced';
              metadataToPut.push(existedItem);
            }
            continue;
          }
          const dupeItem = metadataToPut.find((v) => v.trxId === trxId);
          if (dupeItem) { continue; }

          const bookId = object.attributedTo.id;

          const metadata: EpubMetadata = JSON.parse(item.activity.object.content);
          const timestamp = parseTime(item.activity.published, item.content.TimeStamp);
          metadataToPut.push({
            groupId,
            trxId,
            timestamp,
            status: 'synced',
            userAddress,
            bookId,
            metadata,
          });
        }

        await dbService.putBookMetadata(metadataToPut);
        bookService.updateBookMetadata(metadataToPut);
      },
    );
  } catch (e) {
    console.error(e);
  }
};
