import Dexie from 'dexie';
import { IContentItem } from '~/apis';
import { createSchema } from './helper';
import { applyOldVersions } from './oldVersions';
import { EpubMetadata } from '~/utils';

export interface BookSummary {
  id: string
  groupId: string
  trxId: string
  title: string
  sha256: string
  size: number
  segments: Array<{
    sha256: string
  }>
  status: 'synced' | 'pending'
  complete: boolean
  timestamp: number
  openTime: number
  userAddress: string
}

export interface BookBuffer {
  groupId: string
  bookId: string
  file: Uint8Array
}

export interface BookSegment {
  trxId: string
  groupId: string
  bookId: string
  sha256: string
  buffer: Uint8Array
  userAddress: string
  status: 'synced' | 'pending'
}

export interface GroupStatus {
  groupId: string
  trxId: string
}

export interface PendingTrxItem {
  groupId: string
  trxId: string
  value: IContentItem
}

export interface CoverSummary {
  id: string
  groupId: string
  trxId: string
  bookId: string
  sha256: string
  size: number
  segments: Array<{
    sha256: string
  }>
  status: 'synced' | 'pending'
  complete: boolean
  timestamp: number
  userAddress: string
}

export interface CoverSegment {
  trxId: string
  groupId: string
  coverId: string
  sha256: string
  buffer: Uint8Array
  userAddress: string
  status: 'synced' | 'pending'
}

export interface CoverBuffer {
  id?: number
  coverId: string
  groupId: string
  bookId: string
  file: Uint8Array
  timestamp: number
}

export interface BookMetadata {
  id?: number
  groupId: string
  trxId: string
  bookId: string
  metadata: EpubMetadata
  timestamp: number
  userAddress: string
  status: 'synced' | 'pending'
}

export interface HighlightItem {
  groupId: string
  bookId: string
  cfiRange: string
}

export interface ReadingProgress {
  groupId: string
  bookId: string
  readingProgress: string
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

export interface EmptyTrxItem {
  groupId: string
  trxId: string
  timestamp: number
  lastChecked: number
}

export class Database extends Dexie {
  public book: Dexie.Table<BookSummary>;
  public bookBuffer: Dexie.Table<BookBuffer>;
  public bookSegment: Dexie.Table<BookSegment>;

  public cover: Dexie.Table<CoverSummary>;
  public coverBuffer: Dexie.Table<CoverBuffer>;
  public coverSegment: Dexie.Table<CoverSegment>;


  public groupStatus: Dexie.Table<GroupStatus>;
  public pendingTrx: Dexie.Table<PendingTrxItem>;
  public emptyTrx: Dexie.Table<EmptyTrxItem, number>;

  public highlights: Dexie.Table<HighlightItem, number>;
  public readingProgress: Dexie.Table<ReadingProgress, number>;
  public bookMetadata: Dexie.Table<BookMetadata, number>;
  // public profile: Dexie.Table<ProfileItem, number>;
  // public globalProfile: Dexie.Table<GlobalProfile, number>;

  public constructor(name: string) {
    super(name);
    applyOldVersions(this);

    this.version(1).stores(createSchema({
      book: [
        '[groupId+id]',
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
        '[groupId+bookId]',
        'groupId',
        '[groupId+bookId+cfiRange]',
      ],
      readingProgress: [
        '[groupId+bookId]',
        'groupId',
      ],
      bookMetadata: [
        'id++',
        '[groupId+trxId]',
        '[groupId+bookId]',
        '[groupId+bookId+timestamp]',
        'groupId',
      ],
      // profile: [
      //   'groupId',
      //   'publisher',
      //   'status',
      //   '[groupId+status]',
      //   '[groupId+publisher+status]',
      // ],
      // globalProfile: [
      //   'profile',
      // ],
    }));

    this.book = this.table('book');
    this.bookSegment = this.table('bookSegment');
    this.bookBuffer = this.table('bookBuffer');
    this.pendingTrx = this.table('pendingTrx');
    this.cover = this.table('cover');
    this.coverSegment = this.table('coverSegment');
    this.coverBuffer = this.table('coverBuffer');

    this.groupStatus = this.table('groupStatus');
    this.emptyTrx = this.table('emptyTrx');

    this.highlights = this.table('highlights');
    this.readingProgress = this.table('readingProgress');
    this.bookMetadata = this.table('bookMetadata');
    // this.profile = this.table('profile');
    // this.globalProfile = this.table('globalProfile');
  }
}
