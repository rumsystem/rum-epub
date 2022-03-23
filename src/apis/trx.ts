import request from '../request';

export interface ITrx {
  TrxId: string
  GroupId: string
  SenderPubkey: string
  Data: string
  TimeStamp: number
  Version: string
  Expired: number
  SenderSign: string
}

export const fetchTrx = (GroupId: string, TrxId: string) => request(`/api/v1/trx/${GroupId}/${TrxId}`, {
  method: 'GET',
  quorum: true,
  jwt: true,
}) as Promise<ITrx>;
