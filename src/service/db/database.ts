import Dexie from 'dexie';
import { createSchema } from './helper';
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
  subjects: Array<string>
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
  size: number
  status: 'incomplete' | 'complete' | 'broken'
  time: number
  openTime: number
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

    this.version(11).stores(createSchema({
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
    }));

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

  public get parsingRelatedTables() {
    return [
      this.book,
      this.bookBuffer,
      this.bookSegment,
      this.cover,
      this.coverBuffer,
      this.coverSegment,
      this.groupLatestParsedTrx,
      this.bookMetadata,
    ];
  }

  public get groupRelatedTables() {
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
