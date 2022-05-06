import { promises as fs } from 'fs';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe, identity } from 'fp-ts/lib/function';
import { action, observable, runInAction } from 'mobx';
import { fetchMyNodeInfo } from '~/apis';
import { BOOTSTRAPS } from '~/utils/constant';
import * as Quorum from '~/service/quorum/helper';
import { NODE_TYPE } from '~/service/node';
import { sleep } from '~/utils';
import { initQuorum } from './helper/request';

const state = observable({
  type: NODE_TYPE.UNKNOWN,
  up: false,
  host: '127.0.0.1',
  port: 0,
  jwt: '',
  cert: '',

  serviceInited: false,
});

const ping = async (retries = 60) => {
  for (let i = 0; i < retries; i += 1) {
    await internal.updateStatus();
    if (!state.up) {
      return 'failed';
    }
    const getInfoPromise = fetchMyNodeInfo();
    // await at least 1 sec
    const result = await Promise.allSettled([
      getInfoPromise,
      sleep(1000),
    ]);
    if (result[0].status === 'rejected') {
      continue;
    } else {
      return 'success';
    }
  }

  return 'failed';
};

const internal = {
  up: async (params: { storagePath: string, password: string }) => {
    runInAction(() => {
      state.type = NODE_TYPE.INTERNAL;
      state.up = true;
    });
    const { data } = await Quorum.up({
      bootstraps: BOOTSTRAPS,
      storagePath: params.storagePath,
      password: params.password,
    });

    runInAction(() => {
      state.port = data.port;
      state.up = data.up;
    });
  },
  ping: async (retries = 60): Promise<E.Either<'password' | '', null>> => {
    for (let i = 0; i < retries; i += 1) {
      await internal.updateStatus();
      if (!state.up) {
        const log = await quorumService.getLog();
        if (log.trim().endsWith('could not decrypt key with given password')) {
          return E.left('password');
        }
        return E.left('');
      }
      const getInfoPromise = fetchMyNodeInfo();
      // await at least 1 sec
      const result = await Promise.allSettled([
        getInfoPromise,
        sleep(1000),
      ]);
      if (result[0].status === 'rejected') {
        continue;
      } else {
        return E.right(null);
      }
    }
    return E.left('');
  },
  down: action(async () => {
    state.type = NODE_TYPE.UNKNOWN;
    await Quorum.down();
  }),
  updateStatus: async () => {
    const status = await Quorum.getStatus();
    runInAction(() => {
      state.up = status.data.up;
      state.port = status.data.port;
      state.host = '127.0.0.1';
    });
  },
};

const external = {
  up: async (config: {
    host: string
    port: number
    jwt: string
    cert: string
  }) => {
    runInAction(() => {
      state.type = NODE_TYPE.EXTERNAL;
      state.port = config.port;
      state.host = config.host;
      state.jwt = config.jwt;
      state.cert = config.cert;
      state.up = true;
    });

    const result = await ping();
    return result;
  },
  down: action(() => {
    state.type = NODE_TYPE.UNKNOWN;
    state.up = false;
  }),
  ping: async (retries = 60): Promise<E.Either<'password' | '', null>> => {
    for (let i = 0; i < retries; i += 1) {
      const getInfoPromise = fetchMyNodeInfo();
      // await at least 1 sec
      const result = await Promise.allSettled([
        getInfoPromise,
        sleep(1000),
      ]);
      if (result[0].status === 'rejected') {
        continue;
      } else {
        return E.right(null);
      }
    }
    return E.left('');
  },
};

const getLog = pipe(
  TE.tryCatch(
    async () => {
      const logPath = await Quorum.getLogPath();
      const log = await fs.readFile(logPath.data[0]);
      return log.toString();
    },
    (v) => v as Error,
  ),
  TE.match(() => '', identity),
);

const init = () => {
  initQuorum();
  return () => 1;
};

export const quorumService = {
  state,

  init,
  internal,
  external,
  getLog,
};

(window as any).quorumService = quorumService;
