import type { Database } from './database';
import { createSchema } from './helper';

export const applyOldVersions = (db: Database) => {
  db.version(5).stores(createSchema({
    highlights: [
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
      '[groupId+bookTrx+cfiRange]',
    ],
    readingProgress: [
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
    ],
    book: [
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
    ],
  })).upgrade(async () => {
    await db.table('book').clear();
  });

  db.version(10).stores(createSchema({
    book: [
      'groupId',
      'bookTrx',
      'status',
      '[groupId+bookTrx]',
      '[groupId+status]',
    ],
    bookBuffer: [
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
    ],
    bookSegment: [
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
    ],
    coverSegment: [
      'groupId',
      'bookTrx',
      'coverTrx',
      '[groupId+bookTrx]',
    ],
    cover: [
      'groupId',
      'bookTrx',
      'coverTrx',
      'status',
      '[groupId+bookTrx]',
      '[groupId+bookTrx+status]',
    ],
    coverBuffer: [
      'groupId',
      'coverTrx',
      '[groupId+coverTrx]',
    ],
    groupLatestParsedTrx: [
      'groupId',
      'trxId',
    ],
    highlights: [
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
      '[groupId+bookTrx+cfiRange]',
    ],
    readingProgress: [
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
    ],
    bookMetadata: [
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
    ],
    profile: [
      'groupId',
      'publisher',
      'status',
      '[groupId+status]',
      '[groupId+publisher+status]',
    ],
    globalProfile: [
      'profile',
    ],
  })).upgrade(async () => {
    await Promise.all(
      db.parsingRelatedTables.map((v) => v.clear()),
    );
  });
};
