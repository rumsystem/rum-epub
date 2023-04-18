import { fetchContents } from '~/apis';
import { dbService } from '~/service/db';
import type { ContentTaskManager } from '../ContentTaskManager';
import { state } from './state';

export class EmptyContentManager {
  public constructor(private contentTaskManager: ContentTaskManager) {}
  public async init() {
    const items = await dbService.getEmptyTrx();
    state.items = items;
  }

  public async handleNewTrx(items: Array<{ groupId: string, trxId: string }>) {
    for (const item of items) {
      const hasEmptyTrx = state.items.some((v) => v.groupId === item.groupId && v.trxId === item.trxId);
      if (!hasEmptyTrx) { continue; }
      const contents = await fetchContents(item.groupId, {
        num: 1,
        starttrx: item.trxId,
        includestarttrx: true,
      });
      const content = contents?.[0];
      if (!content) { continue; }
      if (content.TrxId !== item.trxId) { return; }
      await this.contentTaskManager.handleContent(item.groupId, [content]);
      const index = state.items.findIndex((v) => v.groupId === item.groupId && v.trxId === item.trxId);
      state.items.splice(index, 1);
      await dbService.deleteEmptyTrx(item.groupId, item.trxId);
    }
  }
}
