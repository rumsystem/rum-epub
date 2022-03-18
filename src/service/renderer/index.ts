/* eslint-disable */
import Database from './database';
import Node from './node';
import _Object from './object';
import Group from './group';
import Auth from './auth';

export * from './database';
export * from './node';
export * from './object';
export * from './group';
export * from './auth';

import Test from './test';

import { sendRequest, ProcessStatus, initQuorum } from './utils/quorumUtils';
export type { ProcessStatus } from './utils/quorumUtils'

export interface IStore {
  db: Database
  apiOrigin: string
}

export interface UpParam {
  bootstraps?: string[]
  storagePath: string
  password: string
}

export default class QuorumClient {

  store: IStore

  Node: Node

  Object: _Object

  Group: Group

  Auth: Auth

  constructor() {
    this.store = {} as IStore;
    this.store.db = new Database();
    this.store.db.open();

    this.Node = new Node(this.store);
    this.Object = new _Object(this.store);
    this.Group = new Group(this.store);
    this.Auth = new Auth(this.store);

    initQuorum();
  }

  async up(param?: UpParam) {
    const { data: status } = await sendRequest<ProcessStatus>({
      action: 'up',
      param,
    });
    this.store.apiOrigin = `https://127.0.0.1:${status.port}`;;
    await this.Node.ping()
    return status;
  }

  down() {
    sendRequest<ProcessStatus>({
      action: 'down',
    });
  }
}

export const QuorumClientTest = Test;
