import request from '../request';
import { getClient } from './client';

export const createGroup = (params: {
  group_name: string
  consensus_type: string
  encryption_type: string
  /** group_type */
  app_key: string
}) => getClient().Group.create(params);

export const fetchMyGroups = () => getClient().Group.list();

export const joinGroup = (seed: string) => getClient().Group.join(seed);

export const leaveGroup = (groupId: string) => getClient().Group.leave(groupId);

export const clearGroup = (groupId: string) => getClient().Group.clear(groupId);

export const fetchSeed = (groupId: string) => getClient().Group.getSeed(groupId);

export const applyToken = () => request('/app/api/v1/token/apply', {
  method: 'POST',
  quorum: true,
  jwt: true,
})!;

export const refreshToken = () => request('/app/api/v1/token/refresh', {
  method: 'POST',
  quorum: true,
  jwt: true,
})!;

export const changeGroupConfig = (params: {
  action: 'add' | 'del'
  group_id: string
  name: string
  type: 'int' | 'string' | 'bool'
  value: unknown
  memo?: string
}) => getClient().AppConfig.change(params);

export const getGroupConfigKeyList = (groupId: string) => getClient().AppConfig.getKeyList(groupId);

export const getGroupConfigItem = (groupId: string, key: string) => getClient().AppConfig.getValueByKey(groupId, key);
