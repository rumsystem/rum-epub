import Dexie from 'dexie';

export interface HighlightItem {
  id?: number
  groupId: string
  bookTrx: string
  cfiRange: string
}

export interface ReadingProgressItem {
  id?: number
  groupId: string
  bookTrx: string
  readingProgress: string
}

export class Database extends Dexie {
  public highlights: Dexie.Table<HighlightItem, number>;
  public readingProgress: Dexie.Table<ReadingProgressItem, number>;

  public constructor(name: string) {
    super(name);

    this.version(2).stores({
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
    });

    this.highlights = this.table('highlights');
    this.readingProgress = this.table('readingProgress');
  }
}
