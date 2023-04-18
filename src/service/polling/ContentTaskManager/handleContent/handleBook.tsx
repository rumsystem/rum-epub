import { utils } from 'rum-sdk-browser';
import type { IContentItem } from '~/apis';
import { dbService, BookSummary } from '~/service/db';
import { parseTime } from '~/utils';
import { BookSummaryContent, BookSummaryActivity } from '../../types';
import { combineBook } from '../combineBook';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handleBook = async (options: IOptions) => {
  const { groupId, objects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    const bookIds = await db.transaction(
      'rw',
      [db.book],
      async () => {
        const items = objects.map((v) => ({
          content: v,
          activity: v.Data as any as BookSummaryActivity,
        }));

        const books = await dbService.getBook(items.map((v) => ({ groupId, bookId: v.activity.object.id })));
        const newBookIds: Array<string> = [];
        const booksToPut: Array<BookSummary> = [];
        for (const item of items) {
          const object = item.activity.object;
          const id = object.id;
          const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
          const existedBook = books.find((v) => v.id === object.id);
          if (existedBook) {
            const updateExistedBook = existedBook.status === 'pending'
              && existedBook.userAddress === userAddress
              && existedBook.trxId === item.content.TrxId;
            if (updateExistedBook) {
              existedBook.status = 'synced';
              booksToPut.push(existedBook);
            }
            continue;
          }
          const dupeBook = booksToPut.find((v) => v.id === id);
          if (dupeBook) { continue; }
          const metadata: BookSummaryContent = JSON.parse(item.activity.object.content);
          const timestamp = parseTime(item.activity.published, item.content.TimeStamp);
          newBookIds.push(id);
          booksToPut.push({
            id,
            groupId,
            trxId: item.content.TrxId,
            timestamp,
            size: metadata.size,
            complete: false,
            openTime: 0,
            segments: metadata.segments.map((sha256) => ({ sha256 })),
            sha256: metadata.sha256,
            status: 'synced',
            title: object.name,
            userAddress,
          });
        }

        await dbService.putBook(booksToPut);
        return newBookIds;
      },
    );
    combineBook(groupId, bookIds);
  } catch (e) {
    console.error(e);
  }
};
