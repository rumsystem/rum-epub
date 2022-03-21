import request from '../request';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { qwasm } from '~/utils/quorum-wasm/load-quorum';

export interface IGetGroupsResult {
  groups: Array<IGroup> | null
}

export enum GroupStatus {
  IDLE = 'IDLE',
  SYNCING = 'SYNCING',
  SYNC_FAILED = 'SYNC_FAILED',
}

export enum GroupUpdatedStatus {
  ACTIVE = 'ACTIVE',
  RECENTLY = 'RECENTLY',
  SLEEPY = 'SLEEPY',
}

export interface IGroup {
  owner_pubkey: string
  group_id: string
  group_name: string
  user_pubkey: string
  consensus_type: string
  encryption_type: string
  cipher_key: string
  app_key: GROUP_TEMPLATE_TYPE
  last_updated: number
  highest_height: number
  highest_block_id: string
  group_status: GroupStatus
  updatedStatus: GroupUpdatedStatus
  role?: string
  profile?: any
  profileTag?: string
  profileStatus?: string
  person?: any
}

export interface ICreateGroupsResult {
  genesis_block: IGenesisBlock
  group_id: string
  group_name: string
  owner_pubkey: string
  owner_encryptpubkey: string
  consensus_type: string
  encryption_type: string
  cipher_key: string
  app_key: string
  signature: string
}

export interface IGenesisBlock {
  BlockId: string
  GroupId: string
  ProducerPubKey: string
  Hash: string
  Signature: string
  Timestamp: number
}

export interface IGroupResult {
  group_id: string
  signature: string
}

export interface IDeleteGroupResult extends IGroupResult {
  owner_pubkey: string
}

export type GroupConfigKeyListResult = null | Array<{ Name: string, Type: 'STRING' | 'BOOL' | 'INT' }>;

export interface GroupConfigItemResult {
  Name: string
  Type: string
  Value: string
  OwnerPubkey: string
  OwnerSign: string
  Memo: string
  TimeStamp: number
}

export const createGroup = (params: {
  group_name: string
  consensus_type: string
  encryption_type: string
  /** group_type */
  app_key: string
}) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.CreateGroup(JSON.stringify(params)) as Promise<ICreateGroupsResult>;
  }
  return request('/api/v1/group', {
    method: 'POST',
    quorum: true,
    minPendingDuration: 500,
    body: {
      group_name: params.group_name,
      consensus_type: params.consensus_type,
      encryption_type: params.encryption_type,
      app_key: params.app_key,
    },
    jwt: true,
  }) as Promise<ICreateGroupsResult>;
};

export const deleteGroup = (groupId: string) => {
  console.log(groupId);
  throw new Error('not implemented');
  // return request('/api/v1/group', {
  //   method: 'DELETE',
  //   quorum: true,
  //   body: { group_id: groupId },
  //   jwt: true,
  // }) as Promise<IDeleteGroupResult>;
};

export const fetchMyGroups = () => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.GetGroups() as Promise<IGetGroupsResult>;
  }
  return request('/api/v1/groups', {
    method: 'GET',
    quorum: true,
    jwt: true,
  }) as Promise<IGetGroupsResult>;
};

export const joinGroup = (data: ICreateGroupsResult) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.JoinGroup(JSON.stringify(data)) as Promise<IGroupResult>;
  }
  return request('/api/v1/group/join', {
    method: 'POST',
    quorum: true,
    body: data,
    jwt: true,
  }) as Promise<IGroupResult>;
};

export const leaveGroup = (groupId: string) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.LeaveGroup(groupId) as Promise<IGroupResult>;
  }
  return request('/api/v1/group/leave', {
    method: 'POST',
    quorum: true,
    body: { group_id: groupId },
    jwt: true,
  }) as Promise<IGroupResult>;
};

export const clearGroup = (groupId: string) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.ClearGroupData(groupId) as Promise<IGroupResult>;
  }
  return request('/api/v1/group/clear', {
    method: 'POST',
    quorum: true,
    body: { group_id: groupId },
    jwt: true,
  }) as Promise<IGroupResult>;
};

export const syncGroup = (groupId: string) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.StartSync(groupId) as Promise<unknown>;
  }
  return request(`/api/v1/group/${groupId}/startsync`, {
    method: 'POST',
    quorum: true,
    jwt: true,
  })!;
};

export const fetchSeed = (groupId: string) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.GetGroupSeed(groupId) as Promise<IGetGroupsResult>;
  }
  return request(`/api/v1/group/${groupId}/seed`, {
    method: 'GET',
    quorum: true,
    jwt: true,
  }) as Promise<IGetGroupsResult>;
};

export const applyToken = () => {
  if (!process.env.IS_ELECTRON) {
    throw new Error('not implemented');
  }
  return request('/app/api/v1/token/apply', {
    method: 'POST',
    quorum: true,
    jwt: true,
  })!;
};

export const refreshToken = () => {
  if (!process.env.IS_ELECTRON) {
    throw new Error('not implemented');
  }
  return request('/app/api/v1/token/refresh', {
    method: 'POST',
    quorum: true,
    jwt: true,
  })!;
};

export const changeGroupConfig = (params: {
  action: 'add' | 'del'
  group_id: string
  name: string
  type: 'int' | 'string' | 'bool'
  value: unknown
  memo?: string
}) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.MgrAppConfig(JSON.stringify(params)) as Promise<unknown>;
  }
  return request('/api/v1/group/appconfig', {
    method: 'POST',
    quorum: true,
    body: params,
    jwt: true,
  })!;
};

export const getGroupConfigKeyList = (groupId: string) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.GetGroupConfigKeyList(groupId) as Promise<GroupConfigKeyListResult>;
  }
  return request(`/api/v1/group/${groupId}/config/keylist`, {
    method: 'GET',
    quorum: true,
    jwt: true,
  }) as Promise<GroupConfigKeyListResult>;
};

export const getGroupConfigItem = (groupId: string, key: string) => {
  if (!process.env.IS_ELECTRON) {
    return qwasm.GetGroupConfigKey(groupId, key) as Promise<GroupConfigItemResult>;
  }
  return request(`/api/v1/group/${groupId}/config/${key}`, {
    method: 'GET',
    quorum: true,
    jwt: true,
  }) as Promise<GroupConfigItemResult>;
};
