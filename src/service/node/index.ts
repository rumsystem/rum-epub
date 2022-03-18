import { action, observable, runInAction } from 'mobx';
import {
  IGroup,
  fetchMyGroups,
  createGroup as createGroupApi,
  joinGroup as joinGroupApi,
  leaveGroup as leaveGroupApi,
  fetchMyNodeInfo,
  fetchNetwork,
  INetworkGroup,
} from '~/apis';
import { setIntervalAsTimeout } from '~/utils';
import sleep from '~/utils/sleep';

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

  get activeGroup() {
    return this.groups.find((v) => v.group_id === this.activeGroupId) ?? null;
  },

  disposes: [] as Array<() => unknown>,
});

const updateGroups = async (init = false) => {
  const data = await fetchMyGroups();
  runInAction(() => {
    state.groups = data.groups ?? [];
    if (init) {
      state.activeGroupId = state.groups[0].group_id ?? '';
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
  if (!restart && state.disposes.length) {
    throw new Error('can\'t start polling twice');
  }
  if (restart) {
    stopPolling();
  }

  updateGroups();
  updateNodeInfo();
  updateNetworkInfo();

  state.disposes.push(
    setIntervalAsTimeout(updateGroups, 5000),
    setIntervalAsTimeout(updateNodeInfo, 5000),
    setIntervalAsTimeout(updateNetworkInfo, 5000),
  );
};

const stopPolling = action(() => {
  state.disposes.forEach((v) => v());
  state.disposes = [];
});

export const nodeService = {
  init,
  state,

  startPolling,
  createGroup,
  joinGroup,
  leaveGroup,
  changeActiveGroup,
  updateGroups,
  updateNodeInfo,
};
