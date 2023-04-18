import { getClient } from './client';

export const announce = (data: {
  group_id: string
  action: 'add' | 'remove'
  type: 'producer'
  memo: string
}) => getClient().Producer.announce(data);

export const fetchAnnouncedProducers = (groupId: string) => getClient().Producer.listAnnouncedProducers(groupId);

export const producer = (data: {
  group_id: string
  action: 'add' | 'remove'
  producer_pubkey: string
}) => getClient().Producer.declare(data);

export const fetchApprovedProducers = (groupId: string) => getClient().Producer.listApprovedProducers(groupId);
