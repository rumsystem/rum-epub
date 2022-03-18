const DB_NAME = 'quorum_sdk';

import Dexie from 'dexie';

export enum ContentStatus {
  synced = 'synced',
  syncing = 'syncing',
}

export interface IDbObjectItem {
  Id?: number
  GroupId: string
  TrxId: string
  Publisher: string
  TypeUrl: string
  TimeStamp: number
  Content: IContent
  Status: ContentStatus
}

export interface IContent {
  type: 'Note'
  content: string
  id: string
  name?: string
  image?: IImage[]
  inreplyto?: {
    trxid: string
  }
  attributedTo?: Array<Record<string, string>>
}

export interface IImage {
  mediaType: string
  name: string
  content: string
}

export default class Database extends Dexie {
  objects: Dexie.Table<IDbObjectItem, number>;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      objects: [
        '++Id',
        'TrxId',
        'GroupId',
        'Status',
        'Publisher',
        'Content.id',
        '[GroupId+Publisher]',
      ].join(','),
    });
  
    this.objects = this.table('objects');
  }
}