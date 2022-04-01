import Dexie from 'dexie';

export const applyOldVersions = (db: Dexie) => {
  db.version(5).stores({
    highlights: [
      '++id',
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
      '[groupId+bookTrx+cfiRange]',
    ].join(','),
    readingProgress: [
      '++id',
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
    ].join(','),
    book: [
      '++id',
      'groupId',
      'bookTrx',
      '[groupId+bookTrx]',
    ].join(','),
  }).upgrade(async () => {
    await db.table('book').clear();
  });
};
