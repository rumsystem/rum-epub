import { app } from '@electron/remote';
import { observable, runInAction } from 'mobx';
import { join } from 'path';
import { fetchMyNodeInfo } from '~/apis';
import { BOOTSTRAPS } from '~/utils/constant';
import * as Quorum from '~/service/quorum/helper';
import sleep from '~/utils/sleep';
import { initQuorum } from './helper/request';

const state = observable({
  up: false,
  port: 0,
});

export const updateStatus = async () => {
  const status = await Quorum.getStatus();
  runInAction(() => {
    state.up = status.data.up;
    state.port = status.data.port;
  });
};

const ping = async (retries = 60) => {
  for (let i = 0; i < retries; i += 1) {
    const getInfoPromise = fetchMyNodeInfo();
    // await at least 1 sec

    try {
      await Promise.all([
        getInfoPromise,
        sleep(1000),
      ]);
      return 'success';
    } catch (e) {
      continue;
    }
  }

  return 'failed';
};

export const up = async () => {
  const password = '123123';
  const { data } = await Quorum.up({
    bootstraps: BOOTSTRAPS,
    storagePath: join(app.getPath('userData'), 'quorum_user_data'),
    password,
  });

  console.log(data);

  quorumService.state.port = data.port;
  quorumService.state.up = data.up;

  const result = await ping();
  return result;
};

export const down = async () => {
  await Quorum.down();
};

export const init = () => {
  initQuorum();
  return () => 1;
};

export const quorumService = {
  state,

  init,
  updateStatus,
  up,
  down,
};
