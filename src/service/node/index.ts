import { action, observable, runInAction } from 'mobx';
import {
  IGroup,
  fetchMyGroups,
  createGroup as createGroupApi,
  joinGroup as joinGroupApi,
  leaveGroup as leaveGroupApi,
  syncGroup as syncGroupApi,
  fetchMyNodeInfo,
  fetchNetwork,
  INetworkGroup,
  getGroupConfigKeyList,
  getGroupConfigItem,
} from '~/apis';
import { PollingTask, sleep } from '~/utils';
import { dbService } from '~/service/db';
import { busService } from '../bus';

const state = observable({
  groups: [] as Array<IGroup>,
  activeGroupId: '',
  nodeInfo: {
    node_id: '',
    node_publickey: '',
    node_status: '',
    node_version: '',
    peers: {} as Record<string, string[]>,
  },
  network: {
    groups: null as INetworkGroup[] | null,
    addrs: [] as Array<string>,
    ethaddr: '',
    nat_enabled: false,
    nat_type: '',
    peerid: '',
    node: null,
  },
  configMap: new Map<string, Record<string, string | boolean | number>>(),

  get activeGroup() {
    return this.groups.find((v) => v.group_id === this.activeGroupId) ?? null;
  },

  get groupMap() {
    return Object.fromEntries(this.groups.map((v) => [v.group_id, v])) as Record<string, IGroup | undefined>;
  },

  pollings: {
    updateGroups: null as null | PollingTask,
    updateNodeInfo: null as null | PollingTask,
    updateNetworkInfo: null as null | PollingTask,
    updateAllGroupConfig: null as null | PollingTask,
  },
});

const updateGroups = async (init = false) => {
  const data = await fetchMyGroups();
  runInAction(() => {
    const groups = data.groups ?? [];
    groups.sort((a, b) => {
      if (a.group_name > b.group_name) return 1;
      if (a.group_name < b.group_name) return -1;
      if (a.group_id > b.group_id) return 1;
      if (a.group_id < b.group_id) return -1;
      return 0;
    });
    state.groups = groups;
    if (init) {
      state.activeGroupId = state.groups.length
        ? state.groups[0]?.group_id
        : '';
    }
  });
};

const updateNodeInfo = async () => {
  const data = await fetchMyNodeInfo();
  runInAction(() => {
    state.nodeInfo = data;
  });
};

const updateNetworkInfo = async () => {
  const data = await fetchNetwork();
  runInAction(() => {
    state.network = data;
  });
};

const updateGroupConfig = async (groupId: string) => {
  const keylist = await getGroupConfigKeyList(groupId) || [];
  const pairs = await Promise.all(
    keylist.map(async (keyItem) => {
      const item = await getGroupConfigItem(groupId, keyItem.Name);
      return [item.Name, item.Value];
    }),
  );
  const config = Object.fromEntries(pairs) as Record<string, string | boolean | number>;

  runInAction(() => {
    state.configMap.set(groupId, config);
  });
};

const updateAllGroupConfig = async () => {
  for (const group of state.groups) {
    await updateGroupConfig(group.group_id);
  }
};

export const createGroup = async (params: Parameters<typeof createGroupApi>[0]) => {
  const group = await createGroupApi(params);
  for (let i = 0; i < 100; i += 1) {
    await sleep(1000);
    updateGroups();
    if (state.groups.some((v) => v.group_id === group.group_id)) {
      break;
    }
  }
  const theGroup = state.groups.find((v) => v.group_id === group.group_id);
  if (!theGroup) {
    throw new Error(`can't find the group newly created. groupId: ${group.group_id}`);
  }
  return theGroup;
};

export const joinGroup = async (params: Parameters<typeof joinGroupApi>[0]) => {
  const group = await joinGroupApi(params);
  for (let i = 0; i < 100; i += 1) {
    await sleep(1000);
    updateGroups();
    if (state.groups.some((v) => v.group_id === group.group_id)) {
      break;
    }
  }
  const theGroup = state.groups.find((v) => v.group_id === group.group_id);
  if (!theGroup) {
    throw new Error(`can't find the group newly joined. groupId: ${group.group_id}`);
  }
  return theGroup;
};

export const leaveGroup = async (group: string | IGroup) => {
  const groupId = typeof group === 'string'
    ? group
    : group.group_id;

  if (!state.groups.some((v) => v.group_id === groupId)) {
    throw new Error(`try leave group ${groupId} that is not in it`);
  }

  await leaveGroupApi(groupId);
  runInAction(() => {
    state.groups.splice(
      state.groups.findIndex((v) => v.group_id === groupId),
      1,
    );
    if (state.activeGroupId === groupId) {
      state.activeGroupId = state.groups.at(0)?.group_id ?? '';
    }
  });

  busService.emit({
    type: 'group_leave',
    data: { groupId },
  });

  // clear data
  dbService.db.transaction(
    'rw',
    [
      dbService.db.book,
      dbService.db.highlights,
      dbService.db.readingProgress,
    ],
    async () => {
      await Promise.all([
        dbService.db.book.where({
          groupId,
        }).delete(),
        dbService.db.highlights.where({
          groupId,
        }).delete(),
        dbService.db.readingProgress.where({
          groupId,
        }).delete(),
      ]);
    },
  );
};

export const syncGroup = async (group: string | IGroup) => {
  const groupId = typeof group === 'string'
    ? group
    : group.group_id;

  if (!state.groups.some((v) => v.group_id === groupId)) {
    throw new Error(`try sync group ${groupId} that is not in it`);
  }

  await syncGroupApi(groupId);
};

const changeActiveGroup = action((group: string | IGroup) => {
  let groupId = group;
  if (typeof groupId !== 'string') {
    groupId = groupId.group_id;
  }
  if (state.groups.every((v) => v.group_id !== groupId)) {
    throw new Error(`group ${groupId} not exist`);
  }
  state.activeGroupId = groupId;
});

const init = () => stopPolling;

const startPolling = (restart = false) => {
  if (!restart && Object.values(state.pollings).some(Boolean)) {
    throw new Error('can\'t start polling twice');
  }
  if (restart) {
    stopPolling();
  }

  state.pollings.updateGroups = new PollingTask(updateGroups, 5000, true, true);
  state.pollings.updateNodeInfo = new PollingTask(updateNodeInfo, 10000, true, true);
  state.pollings.updateNetworkInfo = new PollingTask(updateNetworkInfo, 10000, true, true);
  state.pollings.updateAllGroupConfig = new PollingTask(updateAllGroupConfig, 20000, true, true);
};

const stopPolling = action(() => {
  Object.keys(state.pollings).forEach((k) => {
    const key = k as keyof typeof state.pollings;
    state.pollings[key]?.stop();
    state.pollings[key] = null;
  });
});

export const nodeService = {
  init,
  state,

  startPolling,
  createGroup,
  joinGroup,
  leaveGroup,
  syncGroup,
  changeActiveGroup,
  updateGroups,
  updateNodeInfo,
  updateGroupConfig,
  updateAllGroupConfig,
};
