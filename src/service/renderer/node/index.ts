import request from '../utils/request';
import { sendRequest, ProcessStatus } from '../utils/quorumUtils';
import type { IStore } from '../index';
import { dialog } from '@electron/remote';
import fs from 'fs';
import util from 'util';
import sleep from '../utils/sleep';

const pWriteFile = util.promisify(fs.writeFile);

export interface INodeInfo {
  node_id: string
  node_publickey: string
  node_status: string
  node_version: string
  peers: Record<string, string[]>
}

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

export default class Node {

  store: IStore

  constructor(store: IStore) {
    this.store = store;
  }

  async status() {
    const { data: status } = await sendRequest<ProcessStatus>({
      action: 'status',
    });
    return status;
  }

  async info() {
    const info: INodeInfo = await request('/api/v1/node', {
      origin: this.store.apiOrigin
    });
    return info;
  }

  async network() {
    const network: INetwork = await request('/api/v1/network', {
      origin: this.store.apiOrigin
    });
    return network;
  }

  async ping(timeout = 60) {
    let done = false;
    let count = 0;
    while (!done) {
      try {
        await this.info();
        done = true;
      } catch (_err) {
        count++;
        if (count > timeout) {
          throw new Error('ping timeout');
        }
        await sleep(1000);
      }
    }
  }

  async exportLogs() {
    const { data } = await sendRequest<ProcessStatus>({
      action: 'status',
    });
    const { logs } = data;
    try {
      const file = await dialog.showSaveDialog({
        defaultPath: 'logs.txt',
      });
      if (!file.canceled && file.filePath) {
        await pWriteFile(
          file.filePath.toString(),
          (logs || '').split(/[\n]/).join('\n\r'),
        );
      }
    } catch (err) {
      console.error(err);
    }
  }
}
