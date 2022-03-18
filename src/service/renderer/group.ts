import request from './utils/request';
import type { IStore } from '.';

export interface IGetGroupsResult {
  groups: Array<IGroup> | null
}

export enum GroupStatus {
  IDLE = 'IDLE',
  SYNCING = 'SYNCING',
  SYNC_FAILED = 'SYNC_FAILED',
}

export interface IGroup {
  owner_pubkey: string
  group_id: string
  group_name: string
  user_pubkey: string
  consensus_type: string
  encryption_type: string
  cipher_key: string
  app_key: string
  last_updated: number
  highest_height: number
  highest_block_id: string
  group_status: GroupStatus
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

export default class Group {

  store: IStore

  constructor(store: IStore) {
    this.store = store;
  }

  async list() {
    const { groups } = await (request('/api/v1/groups', {
      method: 'GET',
      origin: this.store.apiOrigin,
    }) as Promise<IGetGroupsResult>);
    return groups;
  }

  create(params: {
    group_name: string
    consensus_type: string
    encryption_type: string
    app_key: string
  }) {
    return request('/api/v1/group', {
      method: 'POST',
      origin: this.store.apiOrigin,
      body: {
        group_name: params.group_name,
        consensus_type: params.consensus_type,
        encryption_type: params.encryption_type,
        app_key: params.app_key,
      },
    }) as Promise<ICreateGroupsResult>;
  }

  async leave(groupId: string) {
    await request('/api/v1/group/clear', {
      method: 'POST',
      origin: this.store.apiOrigin,
      body: { group_id: groupId },
      jwt: true,
    })
    await request('/api/v1/group/leave', {
      method: 'POST',
      origin: this.store.apiOrigin,
      body: { group_id: groupId },
    }) as Promise<IGroupResult>;
    await this.store.db.objects.where({ GroupId: groupId}).delete();
  }

  onChange() {
    return 'onChange';
  }
}
