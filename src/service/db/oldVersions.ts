import type { Database } from './database';
import { createSchema } from './helper';

export const applyOldVersions = (db: Database) => {
  db.version(1).stores(createSchema({
    book: [
      '[groupId+id]',
      '[groupId+bookId+timestamp]',
      '[groupId+userAddress+timestamp]',
      '[groupId+bookId+userAddress+timestamp]',
      '[groupId+bookId+hotCount]',
      '[groupId+userAddress+hotCount]',
      '[groupId+bookId+userAddress+hotCount]',
      '[groupId+status]',
      '[groupId+status+timestamp]',
      'groupId',
      'status',
    ],
    bookSegment: [
      '[groupId+trxId]',
      '[groupId+bookId]',
      'groupId',
    ],
    bookBuffer: [
      '[groupId+bookId]',
      'groupId',
    ],
    cover: [
      '[groupId+id]',
      '[groupId+status]',
      '[groupId+status+timestamp]',
      'groupId',
      'status',
    ],
    coverSegment: [
      '[groupId+trxId]',
      '[groupId+coverId]',
      'groupId',
    ],
    coverBuffer: [
      'id++',
      '[groupId+coverId]',
      '[groupId+bookId]',
      '[groupId+bookId+timestamp]',
      'groupId',
    ],
    pendingTrx: [
      'groupId',
      '[groupId+trxId]',
    ],
    groupStatus: [
      'groupId',
    ],
    emptyTrx: [
      '[groupId+trxId]',
      'groupId',
    ],
    highlights: [
      '[groupId+bookId+cfiRange]',
      '[groupId+bookId]',
      'groupId',
    ],
    readingProgress: [
      '[groupId+bookId]',
      'groupId',
      'timestamp',
    ],
    bookMetadata: [
      'id++',
      '[groupId+trxId]',
      '[groupId+bookId]',
      '[groupId+bookId+timestamp]',
      'groupId',
    ],

    post: [
      '[groupId+id]',
      '[groupId+trxId]',
      '[groupId+hotCount]',
      '[groupId+timestamp]',
      '[groupId+userAddress]',
      '[groupId+userAddress+hotCount]',
      '[groupId+userAddress+timestamp]',
      '[groupId+bookId+hotCount]',
      '[groupId+bookId+timestamp]',
      '[groupId+bookId+userAddress+hotCount]',
      '[groupId+bookId+userAddress+timestamp]',
      'groupId',
    ],
    comment: [
      '[groupId+id]',
      '[groupId+trxId]',
      '[groupId+postId+hotCount]',
      '[groupId+postId+timestamp]',
      'groupId',
    ],
    counter: [
      '[groupId+trxId]',
      '[groupId+publisher]',
      '[groupId+publisher+objectId]',
      '[groupId+userAddress]',
      '[groupId+userAddress+objectId]',
      'groupId',
    ],
    profile: [
      '[groupId+trxId]',
      '[groupId+publisher]',
      '[groupId+userAddress]',
      '[groupId+trxId+timestamp]',
      '[groupId+publisher+timestamp]',
      '[groupId+userAddress+timestamp]',
      'groupId',
      'trxId',
      'publisher',
      'userAddress',
    ],
    notification: [
      '++id',
      'groupId',
      'type',
      'status',
      'objectId',
      '[groupId+status]',
      '[groupId+type]',
      '[groupId+type+status]',
    ],
  }));
};
