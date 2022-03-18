import request from './utils/request';
import type { IStore } from '.';

export type TrxType = 'POST' | 'ANNOUNCE' | 'REQ_BLOCK_FORWARD' | 'REQ_BLOCK_BACKWARD' | 'BLOCK_SYNCED' | 'BLOCK_PRODUCED' | 'ASK_PEERID';

export type AuthType = 'FOLLOW_ALW_LIST' | 'FOLLOW_DNY_LIST';

export default class Auth {

  store: IStore

  constructor(store: IStore) {
    this.store = store;
  }

  async getFollowingRule(groupId: string, trxType: TrxType) {
    const ret = await request(`/api/v1/group/${groupId}/trx/auth/${trxType.toLowerCase()}`, {
      method: 'GET',
      origin: this.store.apiOrigin
    });
    return ret as {
      'TrxType': TrxType
      'AuthType': AuthType
    };
  }

  async updateFollowingRule(params: {
    group_id: string
    type: 'set_trx_auth_mode'
    config: {
      trx_type: TrxType
      trx_auth_mode: AuthType
      memo: string
    }
  }) {
    const ret = await request('/api/v1/group/chainconfig', {
      method: 'POST',
      origin: this.store.apiOrigin,
      body: {
        ...params,
        config: JSON.stringify({
          ...params.config,
          trx_auth_mode: params.config.trx_auth_mode.toLowerCase(),
        }),
      }
    });
    return ret as {
      'group_id': string
      'owner_pubkey': string
      'sign': string
      'trx_id': string
    };
  }

  async updateAuthList(params: {
    group_id: string
    type: 'upd_alw_list' | 'upd_dny_list'
    config: {
      action: 'add' | 'remove'
      pubkey: string
      trx_type: TrxType[]
      memo: string
    }
  }) {
    const ret = await request('/api/v1/group/chainconfig', {
      method: 'POST',
      origin: this.store.apiOrigin,
      body: {
        ...params,
        config: JSON.stringify({
          ...params.config,
          trx_type: params.config.trx_type.map((item) => item.toLowerCase()),
        }),
      }
    });
    return ret as {
      'group_id': string
      'owner_pubkey': string
      'sign': string
      'trx_id': string
    };
  }

  async getAllowList(groupId: string) {
    const ret = await request(`/api/v1/group/${groupId}/trx/allowlist`, {
      method: 'GET',
      origin: this.store.apiOrigin
    });
    return ret as {
      Pubkey: string
      TrxType: TrxType
      GroupOwnerPubkey: string
      GroupOwnerSign: string
      TimeStamp: number
      Memo: string
    }[] || null;
  }

  async getDenyList(groupId: string) {
    const ret = await request(`/api/v1/group/${groupId}/trx/denylist`, {
      method: 'GET',
      origin: this.store.apiOrigin
    });
    return ret as {
      Pubkey: string
      TrxType: TrxType
      GroupOwnerPubkey: string
      GroupOwnerSign: string
      TimeStamp: number
      Memo: string
    }[] || null;
  }
};
