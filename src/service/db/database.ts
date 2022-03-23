import Dexie from 'dexie';

export interface FileInfo {
  mediaType: string
  name: string
  title: string
  sha256: string
  segments: Array<{
    id: string
    sha256: string
  }>
}

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

export interface BookDatabaseItem {
  id?: number
  groupId: string
  bookTrx: string
  fileInfo: FileInfo
  lastSegmentTrxId: string
  file: Uint8Array
  date: Date
}

export class Database extends Dexie {
  public highlights: Dexie.Table<HighlightItem, number>;
  public readingProgress: Dexie.Table<ReadingProgressItem, number>;
  public book: Dexie.Table<BookDatabaseItem, number>;

  public constructor(name: string) {
    super(name);

    this.version(5).stores({
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
      await this.table('book').clear();
    });

    this.highlights = this.table('highlights');
    this.readingProgress = this.table('readingProgress');
    this.book = this.table('book');
  }
}
