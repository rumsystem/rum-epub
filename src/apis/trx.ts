import { stringify } from 'query-string';
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

type TrxQueueStaus = 'PENDING' | 'SUCCESS' | 'FAIL';

export interface PubQueueResponse {
  Data: Array<{
    GroupId: string
    RetryCount: number
    State: 'SUCCESS' | 'PENDING' | 'FAIL'
    UpdateAt: number
    Trx: ITrx
  }>
  GroupId: string
}

export const fetchTrx = (GroupId: string, TrxId: string) => request(
  `/api/v1/trx/${GroupId}/${TrxId}`,
  {
    method: 'GET',
    quorum: true,
    jwt: true,
  },
) as Promise<ITrx>;


export const getTrxQueue = (GroupId: string, opt: { trx?: string, status?: TrxQueueStaus } = {}) => request(
  `/api/v1/group/${GroupId}/pubqueue?${stringify(opt)}`,
  {
    method: 'GET',
    quorum: true,
    jwt: true,
  },
) as Promise<PubQueueResponse>;

export const ackTrx = (trxIds: Array<string>) => request(
  '/api/v1/trx/ack',
  {
    method: 'POST',
    quorum: true,
    jwt: true,
    body: {
      trx_ids: trxIds,
    },
  },
) as Promise<Array<string>>;
