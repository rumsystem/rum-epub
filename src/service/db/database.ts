import Dexie from 'dexie';
import { applyOldVersions } from './oldVersions';

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
export interface CoverFileInfo {
  mediaType: string
  name: string
  bookTrx: string
  sha256: string
  segments: Array<{
    id: string
    sha256: string
  }>
}

export interface EpubMetadata {
  description: string
  subTitle: string
  isbn: string
  author: string
  translator: string
  publishDate: string
  publisher: string
  languages: Array<string>
  series: string
  seriesNumber: string
  categoryLevel1: string
  categoryLevel2: string
  categoryLevel3: string
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
  status: 'incomplete' | 'complete' | 'broken'
  date: Date
}

export interface GroupLatestParsedTrxItem {
  id?: number
  groupId: string
  trxId: string
}

export interface BookBufferItem {
  id?: number
  groupId: string
  bookTrx: string
  file: Uint8Array
}

export interface BookSegmentItem {
  id?: number
  groupId: string
  bookTrx: string
  segments: Record<string, {
    id: string
    sha256: string
    buf: Uint8Array
  }>
}

export interface CoverItem {
  id?: number
  groupId: string
  bookTrx: string
  fileInfo: CoverFileInfo | null
  coverTrx: string
  status: 'incomplete' | 'complete' | 'broken'
}

export interface CoverBufferItem {
  id?: number
  groupId: string
  bookTrx: string
  coverTrx?: string
  file: Uint8Array
}

export interface CoverSegmentItem {
  id?: number
  groupId: string
  coverTrx: string
  segments: Record<string, {
    id: string
    sha256: string
    buf: Uint8Array
  }>
}

export interface BookMetadataItem {
  id?: number
  groupId: string
  bookTrx: string
  metadata: EpubMetadata
}

export interface ProfileItem {
  id?: number
  groupId: string
  publisher: string
  profile: {
    name: string
    image?: {
      mediaType: string
      content: string
    }
    wallet?: Array<{
      id: string
      type: string
      name: string
    }>
  }
  status: 'synced' | 'syncing'
}

export interface GlobalProfile {
  id?: number
  profile: {
    name: string
    image?: {
      mediaType: string
      content: string
    }
    wallet?: Array<{
      id: string
      type: string
      name: string
    }>
  }
}

export class Database extends Dexie {
  public book: Dexie.Table<BookDatabaseItem, number>;
  public bookBuffer: Dexie.Table<BookBufferItem, number>;
  public bookSegment: Dexie.Table<BookSegmentItem, number>;
  public cover: Dexie.Table<CoverItem, number>;
  public coverBuffer: Dexie.Table<CoverBufferItem, number>;
  public coverSegment: Dexie.Table<CoverSegmentItem, number>;
  public highlights: Dexie.Table<HighlightItem, number>;
  public readingProgress: Dexie.Table<ReadingProgressItem, number>;
  public groupLatestParsedTrx: Dexie.Table<GroupLatestParsedTrxItem, number>;
  public bookMetadata: Dexie.Table<BookMetadataItem, number>;
  public profile: Dexie.Table<ProfileItem, number>;
  public globalProfile: Dexie.Table<GlobalProfile, number>;

  public constructor(name: string) {
    super(name);
    applyOldVersions(this);

    this.version(10).stores({
      book: [
        '++id',
        'groupId',
        'bookTrx',
        'status',
        '[groupId+bookTrx]',
        '[groupId+status]',
      ].join(','),
      bookBuffer: [
        '++id',
        'groupId',
        'bookTrx',
        '[groupId+bookTrx]',
      ].join(','),
      bookSegment: [
        '++id',
        'groupId',
        'bookTrx',
        '[groupId+bookTrx]',
      ].join(','),
      coverSegment: [
        '++id',
        'groupId',
        'bookTrx',
        'coverTrx',
        '[groupId+bookTrx]',
      ].join(','),
      cover: [
        '++id',
        'groupId',
        'bookTrx',
        'coverTrx',
        'status',
        '[groupId+bookTrx]',
        '[groupId+bookTrx+status]',
      ].join(','),
      coverBuffer: [
        '++id',
        'groupId',
        'coverTrx',
        '[groupId+coverTrx]',
      ].join(','),
      groupLatestParsedTrx: [
        '++id',
        'groupId',
        'trxId',
      ].join(','),
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
      bookMetadata: [
        '++id',
        'groupId',
        'bookTrx',
        '[groupId+bookTrx]',
      ].join(','),
      profile: [
        '++id',
        'groupId',
        'publisher',
        'status',
        '[groupId+status]',
        '[groupId+publisher+status]',
      ].join(','),
      globalProfile: [
        '++id',
        'profile',
      ].join(','),
    }).upgrade(async () => {
      await Promise.all(
        this.allTables.map((v) => v.clear()),
      );
    });

    this.book = this.table('book');
    this.bookBuffer = this.table('bookBuffer');
    this.bookSegment = this.table('bookSegment');
    this.cover = this.table('cover');
    this.coverBuffer = this.table('coverBuffer');
    this.coverSegment = this.table('coverSegment');
    this.groupLatestParsedTrx = this.table('groupLatestParsedTrx');

    this.highlights = this.table('highlights');
    this.readingProgress = this.table('readingProgress');
    this.bookMetadata = this.table('bookMetadata');
    this.profile = this.table('profile');
    this.globalProfile = this.table('globalProfile');
  }

  public get bookRelatedTables() {
    return [
      this.book,
      this.bookBuffer,
      this.bookSegment,
      this.cover,
      this.coverSegment,
      this.groupLatestParsedTrx,
    ];
  }

  public get groupRelatedTables() {
    return [
      ...this.bookRelatedTables,
      this.highlights,
      this.readingProgress,
      this.profile,
    ];
  }

  public get allTables() {
    return [
      this.book,
      this.bookBuffer,
      this.bookSegment,
      this.cover,
      this.coverBuffer,
      this.coverSegment,
      this.groupLatestParsedTrx,
      this.highlights,
      this.readingProgress,
      this.bookMetadata,
      this.profile,
      this.globalProfile,
    ];
  }
}
