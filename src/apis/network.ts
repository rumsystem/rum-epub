import request from '../request';
import { getClient } from './client';

export interface INetworkStatsSummaryItem {
  action: string
  failed_count: number
  in_size: number
  out_size: number
  success_count: number
}

export interface INetworkStats {
  summary: {
    [key: string]: INetworkStatsSummaryItem
    connect_peer: INetworkStatsSummaryItem
    join_topic: INetworkStatsSummaryItem
    publish_to_peerid: INetworkStatsSummaryItem
    publish_to_topic: INetworkStatsSummaryItem
    receive_from_topic: INetworkStatsSummaryItem
    rum_chain_data: INetworkStatsSummaryItem
    subscribe_topic: INetworkStatsSummaryItem
  }
}
export const fetchNetwork = () => getClient().Network.get();

export const fetchNetworkStats = (start: string, end: string) => request(
  `/api/v1/network/stats?start=${start}&end=${end}`,
  {
    method: 'GET',
    quorum: true,
    jwt: true,
  },
) as Promise<INetworkStats>;
