import type { IContentItem } from 'rum-fullnode-sdk/dist/apis/content';
import { EmptyTrxItem, dbService } from '~/service/db';
import { state } from '../../EmptyContentManager/state';

interface IOptions {
  groupId: string
  objects: IContentItem[]
}

export const handleEmptyObjects = async (options: IOptions) => {
  const { groupId, objects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    await db.transaction('rw', [db.emptyTrx], async () => {
      const itemsToPut: Array<EmptyTrxItem> = objects.map((v) => ({
        groupId,
        trxId: v.TrxId,
        lastChecked: Date.now(),
        timestamp: Number(v.TimeStamp.slice(0, -6)),
      }));
      await dbService.putEmptyTrx(itemsToPut);
      itemsToPut.forEach((v) => {
        state.items.push(v);
      });
    });
  } catch (e) {
    console.error(e);
  }
};
