import { action, observable, runInAction, when } from 'mobx';
import { ackTrx, getTrxQueue, PubQueueResponse } from '~/apis';
import { PollingTask } from '~/utils';
import { busService } from '~/service/bus';
import { nodeService } from '~/service/node';

const state = observable({
  tasks: new Map<string, Set<string>>(),
  pubqueue: new Map<string, PubQueueResponse['Data']>(),

  pooling: null as null | PollingTask,
  get hasTask() {
    return !!Array.from(this.tasks.values()).reduce((p, c) => p + c.size, 0);
  },
});

const getGroupItem = action((groupId: string) => {
  if (!state.tasks.has(groupId)) {
    state.tasks.set(groupId, new Set());
  }

  return state.tasks.get(groupId)!;
});

const awaitAck = action((groupId: string, trxId: string) => {
  const groupItem = getGroupItem(groupId);
  groupItem.add(trxId);
  return when(() => !groupItem.has(trxId));
});

const fetchAcks = async () => {
  if (!state.hasTask) { return; }

  const successTrxIds = await Promise.all(
    nodeService.state.groups.map(async (group) => {
      const groupId = group.group_id;
      const groupItem = getGroupItem(groupId);
      const queue = await getTrxQueue(groupId);
      const successTrxs = queue.Data.filter((v) => v.State === 'SUCCESS');
      const restTrxs = queue.Data.filter((v) => v.State !== 'SUCCESS');
      runInAction(() => {
        successTrxs.forEach((v) => {
          groupItem.delete(v.Trx.TrxId);
        });
        state.pubqueue.set(groupId, restTrxs);
      });

      return successTrxs.map((v) => v.Trx.TrxId);
    }),
  );

  if (successTrxIds.length) {
    await ackTrx(successTrxIds.flat());
  }
};

const init = () => {
  state.pooling = new PollingTask(fetchAcks, 2000, true, true);
  busService.on('group_leave', (act) => {
    runInAction(() => {
      state.tasks.delete(act.data.groupId);
      state.pubqueue.delete(act.data.groupId);
    });
  });
  return () => {
    state.pooling?.stop();
  };
};

export const trxAckService = {
  init,

  awaitAck,
};
