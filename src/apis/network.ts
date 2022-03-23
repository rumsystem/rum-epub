import request from '../request';

export interface INetworkGroup {
  GroupId: string
  GroupName: string
  Peers: string[] | null
}

export interface INetwork {
  groups: INetworkGroup[] | null
  addrs: string[]
  ethaddr: string
  nat_enabled: boolean
  nat_type: string
  peerid: string
  node: any
}

export const fetchNetwork = () => request('/api/v1/network', {
  method: 'GET',
  quorum: true,
  jwt: true,
}) as Promise<INetwork>;
