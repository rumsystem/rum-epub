import type { actions } from '~/main/quorum';
import { sendRequest } from './request';

type Status = Awaited<ReturnType<typeof actions['status']>>;

export const getStatus = () =>
  sendRequest<Status>({
    action: 'status',
  });

export const up = (param: Parameters<typeof actions['up']>[0]) =>
  sendRequest<Status>({
    action: 'up',
    param,
  });

export const down = async () =>
  sendRequest<Status>({
    action: 'down',
  });

export const getLogPath = async () =>
  sendRequest<Awaited<ReturnType<typeof actions['logPath']>>>({
    action: 'logPath',
  });

export const exportKey = (param: Parameters<typeof actions['exportKey']>[0]) =>
  sendRequest<string>({
    action: 'exportKey',
    param,
  });

export const importKey = (param: Parameters<typeof actions['importKey']>[0]) =>
  sendRequest<string>({
    action: 'importKey',
    param,
  });
