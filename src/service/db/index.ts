import Dexie from 'dexie';
import { BookBuffer, BookMetadata, BookSummary, BookSegment, CoverBuffer, CoverSummary, CoverSegment, Database, EmptyTrxItem, PendingTrxItem } from './database';

export * from './database';

const state = {
  db: null as null | Database,
};

export const initDb = (hash: string) => {
  if (state.db) { return; }
  state.db = new Database(`${hash}-rumbrary`);
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

  getGroupStatus,
  setGroupStatus,

  addPendingTrx,

  getEmptyTrx,
  putEmptyTrx,
  deleteEmptyTrx,
  deleteAllDataFromGroup,
};
