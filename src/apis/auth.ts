import request from '../request';

export type TrxType = 'POST' | 'ANNOUNCE' | 'REQ_BLOCK_FORWARD' | 'REQ_BLOCK_BACKWARD' | 'BLOCK_SYNCED' | 'BLOCK_PRODUCED' | 'ASK_PEERID';

export type AuthType = 'FOLLOW_ALW_LIST' | 'FOLLOW_DNY_LIST';

export interface AuthResponse {
  'group_id': string
  'owner_pubkey': string
  'sign': string
  'trx_id': string
}

export interface AllowOrDenyListItem {
  Pubkey: string
  TrxType: TrxType
  GroupOwnerPubkey: string
  GroupOwnerSign: string
  TimeStamp: number
  Memo: string
}

export interface TrxAuthTypeResult {
  'TrxType': TrxType
  'AuthType': AuthType
}

export const getTrxAuthType = async (groupId: string, trxType: TrxType) => request(
  `/api/v1/group/${groupId}/trx/auth/${trxType.toLowerCase()}`,
  {
    method: 'GET',
    quorum: true,
    jwt: true,
  },
) as Promise<TrxAuthTypeResult>;

export interface ChainAuthModeParams {
  group_id: string
  type: 'set_trx_auth_mode'
  config: {
    trx_type: TrxType
    trx_auth_mode: Lowercase<AuthType>
    memo: string
  }
}

export interface ChainAuthListParams {
  group_id: string
  type: 'upd_alw_list' | 'upd_dny_list'
  config: {
    action: 'add' | 'remove'
    pubkey: string
    trx_type: TrxType[]
    memo: string
  }
}

export type ChainConfigParams = ChainAuthModeParams | ChainAuthListParams;

export const setChainConfig = async (params: ChainConfigParams) => request(
  '/api/v1/group/chainconfig',
  {
    method: 'POST',
    quorum: true,
    body: {
      ...params,
      config: JSON.stringify(params.config),
    },
    jwt: true,
  },
) as Promise<AuthResponse>;

export const getAllowList = async (groupId: string) => request(
  `/api/v1/group/${groupId}/trx/allowlist`,
  {
    method: 'GET',
    quorum: true,
    jwt: true,
  },
) as Promise<Array<AllowOrDenyListItem> | null>;

export const getDenyList = async (groupId: string) => request(
  `/api/v1/group/${groupId}/trx/denylist`,
  {
    method: 'GET',
    quorum: true,
    jwt: true,
  },
) as Promise<Array<AllowOrDenyListItem> | null>;
