import request from '../request';

export interface BackupData {
  config: string
  keystore: string
  seeds: string
}

export const backup = () => request('/api/v1/backup', {
  method: 'GET',
  quorum: true,
  jwt: true,
}) as Promise<BackupData>;
