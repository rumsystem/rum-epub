import Dexie from 'dexie';
import {
  BookBuffer, BookMetadata, BookSummary, BookSegment, CoverBuffer,
  CoverSummary, CoverSegment, Database, EmptyTrxItem, PendingTrxItem, Post, Comment, Notification, Profile, Counter,
} from './database';
import { getHotCount, notNullFilter } from '~/utils';

export * from './database';

const state = {
  db: null as null | Database,
};

export const initDb = (hash: string) => {
  if (state.db) { return; }
  state.db = new Database(`${hash}-rumbrary-v2`);
};

export const init = () => () => state.db?.close();

interface GetBookOption {
  groupId: string
  bookId: string
}

interface GetBook {
  (param: GetBookOption): Promise<BookSummary | undefined>
  (param: Array<GetBookOption>): Promise<Array<BookSummary>>
}

const getBook: GetBook = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const books = await db.book
    .where('[groupId+id]')
    .anyOf(params.map((v) => [v.groupId, v.bookId]))
    .toArray();
  return Array.isArray(param) ? books : books.at(0);
};

const getBookByGroupId = async (groupId: string) => {
  const db = dbService.db;
  return db.book.where({ groupId }).toArray();
};

const updateBookOpenTime = async (groupId: string, bookId: string, timestamp: number) => {
  const db = dbService.db;
  return db.book.where({ groupId, id: bookId }).modify({ openTime: timestamp });
};

const putBook = async (books: Array<BookSummary>) => {
  const db = dbService.db;
  await db.book.bulkPut(books);
};
interface GetBookSegment {
  (param: { groupId: string, trxId: string }): Promise<BookSegment | undefined>
  (param: Array<{ groupId: string, trxId: string }>): Promise<Array<BookSegment>>
}
const getBookSegment: GetBookSegment = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const books = await db.bookSegment
    .where('[groupId+trxId]')
    .anyOf(params.map((v) => [v.groupId, v.trxId]))
    .toArray();
  return Array.isArray(param) ? books : books.at(0);
};

interface GetBookSegmentByBookId {
  (param: { groupId: string, bookId: string }): Promise<BookSegment | undefined>
  (param2: Array<{ groupId: string, bookId: string }>): Promise<Array<BookSegment>>
}
const getBookSegmentByBookId: GetBookSegmentByBookId = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const books = await db.bookSegment
    .where('[groupId+bookId]')
    .anyOf(params.map((v) => [v.groupId, v.bookId]))
    .toArray();
  return Array.isArray(param) ? books : books.at(0);
};

const putBookSegment = async (books: Array<BookSegment>) => {
  const db = dbService.db;
  await db.bookSegment.bulkPut(books);
};

const getBookBuffer = async (groupId: string, bookId: string) => {
  const db = dbService.db;
  return db.bookBuffer.where({ groupId, bookId }).first();
};

const putBookBuffer = async (bookBuffers: Array<BookBuffer>) => {
  const db = dbService.db;
  await db.bookBuffer.bulkPut(bookBuffers);
};

interface GetCover {
  (param: { groupId: string, coverId: string }): Promise<CoverSummary | undefined>
  (param: Array<{ groupId: string, coverId: string }>): Promise<Array<CoverSummary>>
}
const getCover: GetCover = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const covers = await db.cover
    .where('[groupId+id]')
    .anyOf(params.map((v) => [v.groupId, v.coverId]))
    .toArray();
  return Array.isArray(param) ? covers : covers.at(0);
};

const putCover = async (covers: Array<CoverSummary>) => {
  const db = dbService.db;
  await db.cover.bulkPut(covers);
};
interface GetCoverSegment {
  (param: { groupId: string, trxId: string }): Promise<CoverSegment | undefined>
  (param: Array<{ groupId: string, trxId: string }>): Promise<Array<CoverSegment>>
}
const getCoverSegment: GetCoverSegment = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const covers = await db.coverSegment
    .where('[groupId+trxId]')
    .anyOf(params.map((v) => [v.groupId, v.trxId]))
    .toArray();
  return Array.isArray(param) ? covers : covers.at(0);
};

interface GetCoverSegmentByCoverId {
  (param: { groupId: string, coverId: string }): Promise<CoverSegment | undefined>
  (param2: Array<{ groupId: string, coverId: string }>): Promise<Array<CoverSegment>>
}
const getCoverSegmentByCoverId: GetCoverSegmentByCoverId = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const covers = await db.coverSegment
    .where('[groupId+coverId]')
    .anyOf(params.map((v) => [v.groupId, v.coverId]))
    .toArray();
  return Array.isArray(param) ? covers : covers.at(0);
};

const putCoverSegment = async (covers: Array<CoverSegment>) => {
  const db = dbService.db;
  await db.coverSegment.bulkPut(covers);
};

const getCoverBuffer = async (groupId: string, bookId: string) => {
  const db = dbService.db;
  return db.coverBuffer
    .where('[groupId+bookId+timestamp]')
    .between(
      [groupId, bookId, Dexie.minKey],
      [groupId, bookId, Dexie.maxKey],
    )
    .last();
};

const putCoverBuffer = async (coverBuffers: Array<CoverBuffer>) => {
  const db = dbService.db;
  await db.coverBuffer.bulkPut(coverBuffers);
};

const getBookMetadata = async (groupId: string, bookId: string) => {
  const db = dbService.db;
  return db.bookMetadata
    .where('[groupId+bookId+timestamp]')
    .between(
      [groupId, bookId, Dexie.minKey],
      [groupId, bookId, Dexie.maxKey],
    )
    .last();
};

const getBookMetadataByTrxId = async (items: Array<{ groupId: string, trxId: string }>) => {
  const db = dbService.db;
  return db.bookMetadata
    .where('[groupId+trxId]')
    .anyOf(items.map((v) => [v.groupId, v.trxId]))
    .toArray();
};

const putBookMetadata = async (items: Array<BookMetadata>) => {
  const db = dbService.db;
  await db.bookMetadata.bulkPut(items);
};

interface GetPostOption {
  groupId: string
  id: string
}
interface GetPost {
  (param: GetPostOption): Promise<Post | undefined>
  (param: Array<GetPostOption>): Promise<Array<Post>>
}

const getPost: GetPost = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const posts = await db.post
    .where('[groupId+id]')
    .anyOf(params.map((v) => [v.groupId, v.id]))
    .toArray();
  return Array.isArray(param) ? posts : posts.at(0);
};

const putPost = async (posts: Array<Post>) => {
  const db = dbService.db;
  await db.post.bulkPut(posts);
};

interface ListPostParams {
  groupId: string
  bookId?: string
  offset: number
  limit: number
  userAddress?: string
  search?: string
  order: 'hot' | 'time'
  quote?: boolean
}

const listPost = async (param: ListPostParams) => {
  const db = dbService.db;
  const conditions = [
    ['groupId', param.groupId],
    ['deleted', 0],
    param.bookId ? ['bookId', param.bookId] : [],
    param.userAddress ? ['userAddress', param.userAddress] : [],
  ].filter((v) => v.length);
  const where = [
    ...conditions.map((v) => v[0]),
    param.order === 'hot' ? 'hotCount' : 'timestamp',
  ].join('+');
  const whereParams = conditions.map((v) => v[1]);
  const posts = await db.post
    .where(`[${where}]`)
    .between(
      [...whereParams, Dexie.minKey],
      [...whereParams, Dexie.maxKey],
    )
    .reverse()
    .offset(param.offset)
    .limit(param.limit)
    .toArray();
  return posts;
};

const deletePost = async (groupId: string, postId: string | Array<string>) => {
  const postIds = Array.isArray(postId) ? postId : [postId];
  const db = dbService.db;
  await db.post
    .where('[groupId+id]')
    .anyOf(postIds.map((id) => [groupId, id]))
    .modify({ deleted: 1 });
};

interface GetProfileByTrxId {
  groupId: string
  trxId: string
}
interface GetProfileByUserAddress {
  groupId: string
  userAddress: string
}
interface GetProfile {
  (param: GetProfileByTrxId | GetProfileByUserAddress): Promise<Profile | undefined>
  (param: Array<GetProfileByTrxId> | Array<GetProfileByUserAddress>): Promise<Array<Profile>>
}
const getProfile: GetProfile = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  if (!params.length) { return []; }
  let profiles: Profile[];
  if ('trxId' in params[0]) {
    const list = params as Array<GetProfileByTrxId>;
    profiles = await db.profile
      .where('[groupId+trxId]')
      .anyOf(list.map((v) => [v.groupId, v.trxId]))
      .toArray();
  } else {
    const list = params as Array<GetProfileByUserAddress>;
    profiles = (await Promise.all(
      list.map(async (item) => {
        const profile = await db.profile
          .where('[groupId+userAddress+timestamp]')
          .between(
            [item.groupId, item.userAddress, Dexie.minKey],
            [item.groupId, item.userAddress, Dexie.maxKey],
          )
          .last();
        return profile;
      }),
    )).filter(notNullFilter);
  }
  return Array.isArray(param) ? profiles : profiles.at(0);
};

const putProfile = async (profiles: Array<Profile>) => {
  const db = dbService.db;
  await db.profile.bulkPut(profiles);
};

interface GetCounterOption {
  groupId: string
  trxId: string
}
interface GetCounter {
  (param: GetCounterOption): Promise<Counter | undefined>
  (param: Array<GetCounterOption>): Promise<Array<Counter>>
}
const getCounter: GetCounter = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const counters = await db.counter
    .where('[groupId+trxId]')
    .anyOf(params.map((v) => [v.groupId, v.trxId]))
    .toArray();
  return Array.isArray(param) ? counters : counters.at(0);
};

const putCounter = async (counters: Array<Counter>) => {
  const db = dbService.db;
  await db.counter.bulkPut(counters);
};

interface UpdateObjectCounterParams {
  object: Post | Comment
  likeCount?: number
  dislikeCount?: number
  commentCount?: number
  nonAuthorCommentCount?: number
  liked?: boolean
  disliked?: boolean
}

const updateObjectCounter = async (params: UpdateObjectCounterParams) => {
  const { object } = params;
  const db = dbService.db;
  const table = 'postId' in object ? db.comment : db.post;
  await table.where({
    groupId: object.groupId,
    id: object.id,
  }).modify((item) => {
    if ('likeCount' in params) {
      item.likeCount += params.likeCount ?? 0;
    }
    if ('dislikeCount' in params) {
      item.likeCount += params.dislikeCount ?? 0;
    }
    if ('commentCount' in params) {
      item.commentCount += params.commentCount ?? 0;
    }
    if ('nonAuthorCommentCount' in params) {
      item.nonAuthorCommentCount += params.nonAuthorCommentCount ?? 0;
    }
    if ('liked' in params) {
      item.liked = !!params.liked;
    }
    if ('disliked' in params) {
      item.disliked = !!params.disliked;
    }
    item.hotCount = getHotCount(item);
  });
};

const putNotification = async (notifications: Array<Notification>) => {
  const db = dbService.db;
  await db.notification.bulkPut(notifications);
};

const getNotificationUnreadCount = async (groupId: string) => {
  const db = dbService.db;
  const count = await db.notification.where({
    groupId,
    status: 'unread',
  }).count();
  return count;
};

interface ListNotificationParams {
  groupId: string
  status?: Notification['status']
  type?: Notification['type'] | Array<Notification['type']>
  limit: number
  offset: number
}

const listNotification = async (params: ListNotificationParams) => {
  const db = dbService.db;
  const type = params.type ? [params.type].flatMap((v) => v) : undefined;
  if (!type) {
    const items = await db.notification
      .where({
        groupId: params.groupId,
        ...params.status ? { status: params.status } : {},
      })
      .reverse()
      .offset(params.offset)
      .limit(params.limit)
      .toArray();
    return items;
  }

  const arr = type.map((v) => [params.groupId, v, params.status].filter(notNullFilter));
  const items = await db.notification
    .where(params.status ? '[groupId+type+status]' : '[groupId+type]')
    .anyOf(...arr)
    .reverse()
    .offset(params.offset)
    .limit(params.limit)
    .toArray();
  return items;
};

const clearUnreadNotification = async (groupId: string) => {
  const db = dbService.db;
  await db.notification
    .where({ groupId, status: 'unread' })
    .modify({ status: 'read' });
};

interface GetCommentOption {
  groupId: string
  id: string
}

interface GetComment {
  (param: GetCommentOption): Promise<Comment | undefined>
  (param: Array<GetCommentOption>): Promise<Array<Comment>>
}

const getComment: GetComment = async (param): Promise<any> => {
  const db = dbService.db;
  const params = Array.isArray(param) ? param : [param];
  const comments = await db.comment
    .where('[groupId+id]')
    .anyOf(params.map((v) => [v.groupId, v.id]))
    .toArray();
  return Array.isArray(param) ? comments : comments.at(0);
};

const putComment = async (comments: Array<Comment>) => {
  const db = dbService.db;
  await db.comment.bulkPut(comments);
};


interface ListCommentParams {
  groupId: string
  postId: string
  offset: number
  limit: number
  order: 'hot' | 'time'
}

const listComment = async (param: ListCommentParams) => {
  const db = dbService.db;
  const where = [
    'groupId',
    'postId',
    param.order === 'hot' ? 'hotCount' : 'timestamp',
  ].filter((v) => v).join('+');
  const comments = await db.comment
    .where(`[${where}]`)
    .between(
      [param.groupId, param.postId, Dexie.minKey],
      [param.groupId, param.postId, Dexie.maxKey],
    )
    .limit(param.limit)
    .offset(param.offset)
    .reverse()
    .toArray();
  return comments;
};


const getGroupStatus = (groupId: string) => {
  const db = dbService.db;
  return db.groupStatus.where({ groupId }).first();
};

const setGroupStatus = (groupId: string, trxId: string) => {
  const db = dbService.db;
  return db.groupStatus.put({ groupId, trxId });
};

const addPendingTrx = (items: Array<PendingTrxItem>) => {
  const db = dbService.db;
  return db.pendingTrx.bulkPut(items);
};

const deletePendingTrx = (items: Array<Pick<PendingTrxItem, 'groupId' | 'trxId'>>) => {
  const db = dbService.db;
  return db.pendingTrx
    .where('[groupId+trxId]')
    .anyOf(items.map((v) => [v.groupId, v.trxId]))
    .delete();
};

const getEmptyTrx = () => {
  const db = dbService.db;
  return db.emptyTrx.toArray();
};

const putEmptyTrx = (items: Array<EmptyTrxItem>) => {
  const db = dbService.db;
  return db.emptyTrx.bulkPut(items);
};

const deleteEmptyTrx = async (groupId: string, trxId: string) => {
  const db = dbService.db;
  await db.emptyTrx.where({ groupId, trxId }).delete();
};

const deleteAllDataFromGroup = async (groupId: string) => {
  const db = dbService.db;
  const tables = [
    'book',
    'bookSegment',
    'bookBuffer',
    'cover',
    'coverSegment',
    'coverBuffer',
    'pendingTrx',
    'groupStatus',
    'emptyTrx',
    'highlights',
    'readingProgress',
    'bookMetadata',
  ] as const;
  await Promise.all(
    tables.map((table) => db[table].where({ groupId }).delete()),
  );
};

export const dbService = {
  get db() {
    if (!state.db) {
      throw new Error('try using db before init');
    }
    (window as any).db = state.db;
    return state.db;
  },
  init,
  initDb,

  getBook,
  getBookByGroupId,
  updateBookOpenTime,

  putBook,
  getBookSegment,
  getBookSegmentByBookId,
  putBookSegment,
  getBookBuffer,
  putBookBuffer,

  getCover,
  putCover,
  getCoverSegment,
  getCoverSegmentByCoverId,
  putCoverSegment,
  getCoverBuffer,
  putCoverBuffer,

  getBookMetadata,
  getBookMetadataByTrxId,
  putBookMetadata,

  getPost,
  putPost,
  listPost,
  deletePost,

  getProfile,
  putProfile,

  getCounter,
  putCounter,
  updateObjectCounter,

  putNotification,
  getNotificationUnreadCount,
  listNotification,
  clearUnreadNotification,

  getComment,
  putComment,
  listComment,

  getGroupStatus,
  setGroupStatus,

  addPendingTrx,
  deletePendingTrx,

  getEmptyTrx,
  putEmptyTrx,
  deleteEmptyTrx,
  deleteAllDataFromGroup,

};
