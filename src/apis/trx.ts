import { getClient } from './client';

export const fetchTrx = (GroupId: string, TrxId: string) => getClient().Trx.get(GroupId, TrxId);
