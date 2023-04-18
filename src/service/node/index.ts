import { action, observable, reaction, runInAction } from 'mobx';
import { json, either, function as fp } from 'fp-ts';
import {
  fetchMyGroups, createGroup as createGroupApi, joinGroup as joinGroupApi,
  leaveGroup as leaveGroupApi, fetchMyNodeInfo, fetchNetwork,
  getAllowList, getDenyList, getFollowingRule, getGroupConfigItem,
  getGroupConfigKeyList, refreshToken,
  AuthTypeUpper, IAllowOrDenyListItem, IGroup, INetwork, TrxType,
} from '~/apis';
import { PollingTask, sleep } from '~/utils';
import { dbService } from '~/service/db';
import { busService } from '~/service/bus';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { getConfig, NodeInfoStore, NODE_TYPE, writeConfig } from './helper';

export { NODE_TYPE } from './helper';
export type { NodeInfoStore } from './helper';

export type GroupTrxAuthRecord = Partial<Record<TrxType, AuthTypeUpper | undefined>>;
export const GROUP_JOIN_ORDER_STORAGE_KEY = 'GROUP_JOIN_ORDER_STORAGE_KEY';

const state = observable({
  groups: [] as Array<IGroup>,
  nodeInfoConfig: null as null | NodeInfoStore,
  nodeInfo: {
    node_id: '',
    node_publickey: '',
    node_status: '',
    node_version: '',
    peers: {} as Record<string, string[]>,
  },
  network: {
    groups: null,
    addrs: [],
    eth_addr: '',
    nat_enabled: false,
    nat_type: '',
    peer_id: '',
    node: null,
  } as INetwork,
  trxAuthTypeMap: new Map<string, GroupTrxAuthRecord>(),
  allowListMap: new Map<string, Array<IAllowOrDenyListItem >>(),
  denyListMap: new Map<string, Array<IAllowOrDenyListItem>>(),
  configMap: new Map<string, Record<string, string | boolean | number>>(),

  groupJoinOrder: [] as Array<string>,

  get groupMap() {
    return Object.fromEntries(this.groups.map((v) => [v.group_id, v])) as Record<string, IGroup | undefined>;
  },

  get filteredGroups() {
    const filteredGroups = nodeService.state.groups
      .filter((v) => v.app_key === GROUP_TEMPLATE_TYPE.EPUB);
    return filteredGroups;
  },

  pollings: {
    updateGroups: null as null | PollingTask,
    updateNodeInfo: null as null | PollingTask,
    updateNetworkInfo: null as null | PollingTask,
    updateAllGroupConfig: null as null | PollingTask,
    updateAllGroupTrxAuthType: null as null | PollingTask,
    updateToken: null as null | PollingTask,
  },
  pollingStarted: false,
});

const updateGroups = async () => {
  const data = await fetchMyGroups();
  const groups = data.groups ?? [];
  groups.sort((a, b) => {
    if (a.group_name > b.group_name) return 1;
    if (a.group_name < b.group_name) return -1;
    if (a.group_id > b.group_id) return 1;
    if (a.group_id < b.group_id) return -1;
    return 0;
  });
  runInAction(() => {
    groups.forEach((v) => {
      if (!state.groupJoinOrder.includes(v.group_id)) {
        state.groupJoinOrder.push(v.group_id);
      }
    });
    state.groupJoinOrder = state.groupJoinOrder.filter((v) => groups.some((u) => u.group_id === v));
    state.groups = groups;
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

const updateTrxAuthType = async (groupId: string) => {
  const groupItem = state.trxAuthTypeMap.get(groupId) ?? observable({} as GroupTrxAuthRecord);
  if (!state.trxAuthTypeMap.has(groupId)) {
    runInAction(() => {
      state.trxAuthTypeMap.set(groupId, groupItem);
    });
  }
  const postAuthType = await getFollowingRule(groupId, 'POST');
  runInAction(() => {
    groupItem.POST = postAuthType.AuthType;
  });

  if (postAuthType.AuthType === 'FOLLOW_ALW_LIST') {
    const allowList = await getAllowList(groupId);
    runInAction(() => {
      state.allowListMap.set(groupId, allowList ?? []);
    });
  }
  if (postAuthType.AuthType === 'FOLLOW_DNY_LIST') {
    const denyList = await getDenyList(groupId);
    runInAction(() => {
      state.denyListMap.set(groupId, denyList ?? []);
    });
  }
};

const updateAllGroupTrxAuthType = async () => {
  for (const group of state.groups) {
    await updateTrxAuthType(group.group_id);
  }
};

const updateToken = async () => {
  if (state.nodeInfoConfig?.type !== NODE_TYPE.EXTERNAL) {
    return;
  }

  const { token } = await refreshToken();
  const externalNode = state.nodeInfoConfig.externalNode;
  const historyExtenralNodes = state.nodeInfoConfig.historyExtenralNodes;
  runInAction(() => {
    if (externalNode && historyExtenralNodes) {
      historyExtenralNodes
        .filter((v) => (['jwt', 'port', 'host'] as const).forEach((k) => v[k] === externalNode[k]))
        .forEach((v) => {
          v.jwt = token;
        });
      externalNode.jwt = token;
    }
  });
  saveNodeConfig();
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
  });

  busService.emit({
    type: 'group_leave',
    data: { groupId },
  });

  // clear data
  await dbService.deleteAllDataFromGroup(groupId);
};

export const syncGroup = (_group: string | IGroup) => {
  // TODO: sync group
  state.pollings.updateGroups?.runImmediately();
};

const init = action(() => {
  state.groupJoinOrder = fp.pipe(
    json.parse(localStorage.getItem(GROUP_JOIN_ORDER_STORAGE_KEY) ?? ''),
    either.map((v) => (Array.isArray(v) ? v as Array<string> : [])),
    either.getOrElse(() => [] as Array<string>),
  );

  const disposes = [
    reaction(
      () => JSON.stringify(state.groupJoinOrder),
      action(() => {
        localStorage.setItem(GROUP_JOIN_ORDER_STORAGE_KEY, JSON.stringify(state.groupJoinOrder));
      }),
    ),
  ];

  return () => {
    disposes.forEach((v) => v());
    stopPolling();
  };
});

const loadNodeConfig = async () => {
  const config = await getConfig();
  runInAction(() => {
    state.nodeInfoConfig = config;
  });
};

const saveNodeConfig = async () => {
  if (!state.nodeInfoConfig) {
    return;
  }
  await writeConfig(state.nodeInfoConfig)();
};

const resetNodeConfig = async () => {
  nodeService.state.nodeInfoConfig = {
    type: NODE_TYPE.UNKNOWN,
    externalNode: null,
    internalNode: null,
    historyExtenralNodes: [],
  };
  await saveNodeConfig();
};

const startPolling = action((restart = false) => {
  if (!restart && Object.values(state.pollings).some(Boolean)) {
    throw new Error('can\'t start polling twice');
  }

  if (restart) {
    stopPolling();
  }

  state.pollings.updateGroups = new PollingTask(updateGroups, 5 * 1000, true, true);
  state.pollings.updateNodeInfo = new PollingTask(updateNodeInfo, 10 * 1000, true, true);
  state.pollings.updateNetworkInfo = new PollingTask(updateNetworkInfo, 10 * 1000, true, true);
  state.pollings.updateAllGroupConfig = new PollingTask(updateAllGroupConfig, 20 * 1000, true, true);
  state.pollings.updateAllGroupTrxAuthType = new PollingTask(updateAllGroupTrxAuthType, 30 * 1000, true, true);
  state.pollings.updateToken = new PollingTask(updateToken, 300 * 1000, true, true);
  state.pollingStarted = true;

  return stopPolling;
});

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
  updateGroups,
  updateNodeInfo,
  updateGroupConfig,
  updateAllGroupConfig,
  updateTrxAuthType,
  updateAllGroupTrxAuthType,
  loadNodeConfig,
  saveNodeConfig,
  resetNodeConfig,
};
