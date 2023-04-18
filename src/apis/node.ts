import { getClient } from './client';

export const fetchMyNodeInfo = () => getClient().Node.get();
