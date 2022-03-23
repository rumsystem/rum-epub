import request from '../request';

export interface IAnnouncedProducer {
  Action: 'ADD' | 'REMOVE'
  AnnouncedPubkey: string
  AnnouncerSign: string
  Result: 'ANNOUNCED' | 'APPROVED'
  Memo: string
  TimeStamp: number
}

export interface IApprovedProducer {
  ProducerPubkey: string
  OwnerPubkey: string
  OwnerSign: string
  TimeStamp: number
  BlockProduced: number
}

export const announce = (data: {
  group_id: string
  action: 'add' | 'remove'
  type: 'producer'
  memo: string
}) => request('/api/v1/group/announce', {
  method: 'POST',
  quorum: true,
  body: data,
  jwt: true,
}) as Promise<{
  group_id: string
  sign_pubkey: string
  encrypt_pubkey: string
  type: string
  action: string
  sign: string
  trx_id: string
}>;

export const fetchAnnouncedProducers = (groupId: string) => request(`/api/v1/group/${groupId}/announced/producers`, {
  quorum: true,
  jwt: true,
}) as Promise<Array<IAnnouncedProducer>>;

export const producer = (data: {
  group_id: string
  action: 'add' | 'remove'
  producer_pubkey: string
}) => request('/api/v1/group/producer', {
  method: 'POST',
  quorum: true,
  body: data,
  jwt: true,
}) as Promise<{
  group_id: string
  producer_pubkey: string
  owner_pubkey: string
  sign: string
  trx_id: string
  memo: string
  action: string
}>;

export const fetchApprovedProducers = (groupId: string) => request(`/api/v1/group/${groupId}/producers`, {
  quorum: true,
  jwt: true,
}) as Promise<Array<IApprovedProducer>>;
