import type {
  TrxTypeUpper,
  AuthTypeLower,
  TrxTypeLower,
  IUpdateChainConfig,
} from 'rum-fullnode-sdk/dist/apis/auth';
import { getClient } from './client';

export type TrxType = TrxTypeUpper;
export type AuthType = AuthTypeLower;

export interface AuthResponse {
  'group_id': string
  'owner_pubkey': string
  'sign': string
  'trx_id': string
}

export const getFollowingRule = async (groupId: string, trxType: TrxType) => getClient().Auth.getAuthRule(groupId, trxType);

export const updateFollowingRule = async (params: IUpdateChainConfig) => getClient().Auth.updateChainConfig(params);

export const updateAuthList = async (params: {
  group_id: string
  type: 'upd_alw_list' | 'upd_dny_list'
  config: {
    action: 'add' | 'remove'
    pubkey: string
    trx_type: TrxTypeLower[]
    memo: string
  }
}) => getClient().Auth.updateChainConfig(params);

export const getAllowList = async (groupId: string) => getClient().Auth.getAllowList(groupId);

export const getDenyList = async (groupId: string) => getClient().Auth.getDenyList(groupId);
