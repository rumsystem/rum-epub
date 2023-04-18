import { ipcRenderer } from 'electron';
import type { actions } from '~/main/quorum';

let id = 0;

type ValidActions = keyof typeof actions;

const callbackQueueMap = new Map<number, (v: unknown) => unknown>();

export interface QuorumIPCRequest {
  action: ValidActions
  param?: any
  id: number
}

export interface QuorumIPCResult<T extends unknown> {
  id: number
  data: T
  error: string | null
}

export const sendRequest = <T extends unknown>(
  param: Pick<QuorumIPCRequest, Exclude<keyof QuorumIPCRequest, 'id'>>,
) => {
  id += 1;
  const requestId = id;
  let resolve: (v: unknown) => unknown = () => {};
  const promise = new Promise<unknown>((rs) => {
    resolve = rs;
  });
  callbackQueueMap.set(requestId, resolve);
  const data: QuorumIPCRequest = {
    ...param,
    id: requestId,
  };
  ipcRenderer.send('quorum', data);
  return promise as Promise<QuorumIPCResult<T>>;
};

let hasInited = false;

export const initQuorum = () => {
  if (hasInited) {
    return;
  }
  hasInited = true;
  ipcRenderer.on('quorum', (_event, args) => {
    const id = args.id;
    if (!id) {
      return;
    }

    const callback = callbackQueueMap.get(id);
    if (!callback) {
      return;
    }

    callback(args);
    callbackQueueMap.delete(id);
  });
};
