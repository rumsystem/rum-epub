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
  timestamp: number
}

export interface ProfileItem {
  id?: number
  groupId: string
  userAddress: string
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

export interface PostRaw {
  id: string
  trxId: string
  groupId: string
  bookId: string
  chapter: string
  chapterId: string
  quote: string
  quoteRange: string
  title: string
  content: string
  images?: Array<{
    mediaType: string
    content: string
  } | {
    url: string
  }>
  status: 'synced' | 'pending'
  userAddress: string
  timestamp: number
  hotCount: number
  likeCount: number
  dislikeCount: number
  commentCount: number
  nonAuthorCommentCount: number
  liked: boolean
  disliked: boolean
}

export interface Post extends PostRaw {
  user: Profile
}

export interface CommentRaw {
  id: string
  trxId: string
  groupId: string
  postId: string
  threadId: string
  replyTo: string
  title: string
  content: string
  images?: Array<{
    mediaType: string
    content: string
  } | {
    url: string
  }>
  status: 'synced' | 'pending'
  userAddress: string
  timestamp: number
  hotCount: number
  commentCount: number
  nonAuthorCommentCount: number
  likeCount: number
  dislikeCount: number
  liked: boolean
  disliked: boolean
}
export interface Comment extends CommentRaw {
  user: Profile
}

export interface Counter {
  trxId: string
  groupId: string
  type: 'like' | 'dislike' | 'undolike' | 'undodislike'
  objectType: 'post' | 'comment'
  objectId: string
  userAddress: string
  timestamp: number
  status: 'synced' | 'pending'
}

export interface Profile {
  trxId: string
  userAddress: string
  groupId: string
  name: string
  avatar?: {
    mediaType: string
    content: string
  }
  timestamp: number
  status: 'synced' | 'pending'
}

export interface Notification {
  id?: string
  groupId: string
  objectId: string
  from: string
  type: 'postLike' | 'commentLike' | 'comment' | 'commentReply'
  status: 'read' | 'unread'
  timestamp: number
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

  public post: Dexie.Table<PostRaw, number>;
  public comment: Dexie.Table<CommentRaw, number>;
  public counter: Dexie.Table<Counter, number>;
  public profile: Dexie.Table<Profile, number>;
  public notification: Dexie.Table<Notification, number>;

  public constructor(name: string) {
    super(name);
    applyOldVersions(this);

    this.version(1).stores(createSchema({
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

    this.post = this.table('post');
    this.comment = this.table('comment');
    this.counter = this.table('counter');
    this.profile = this.table('profile');
    this.notification = this.table('notification');
  }
}
