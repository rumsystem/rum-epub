import request from '../request';

export interface INodeInfo {
  node_id: string
  node_publickey: string
  node_status: string
  node_version: string
  peers: Record<string, string[]>
}

export const fetchMyNodeInfo = () => request('/api/v1/node', {
  method: 'GET',
  quorum: true,
  jwt: true,
}) as Promise<INodeInfo>;
