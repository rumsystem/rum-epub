import { action, observable, runInAction } from 'mobx';
import { fetchContents, postContent } from '~/apis';
import { promiseAllSettledThrottle, runLoading, sleep } from '~/utils';
import { dbService, HighlightItem, FileInfo } from '~/service/db';
import { parseEpub, ParsedEpubBook, checkTrx, EpubItem, hashBufferSha256 } from './helper';
import { busService } from '../bus';

export * from './helper';

interface SegmentUploadStatus {
  name: string
  status: 'pending' | 'uploading' | 'done'
}

interface GroupUploadState {
  epub: ParsedEpubBook | null
  uploading: boolean
  uploadDone: boolean
  segments: Array<SegmentUploadStatus>
  recentUploadBook: EpubItem | null
}

const state = observable({
  uploadMap: new Map<string, GroupUploadState>(),
  bookMap: new Map<string, Array<EpubItem>>(),
  highlightMap: new Map<string, Map<string, Array<HighlightItem>>>(),
  parseAllTrxPromiseMap: new Map<string, null | Promise<unknown>>(),
  bookBufferLRUCache: new Map<string, { buf: Uint8Array, time: number }>(),
});

const getOrInit = action((groupId: string, reset = false) => {
  let item = state.uploadMap.get(groupId);
  if (reset || !item) {
    item = observable({
      epub: null,
      uploading: false,
      uploadDone: false,
      segments: [],
      recentUploadBook: item?.recentUploadBook ?? null,
    });
    state.uploadMap.set(groupId, item);
  }
  return item;
});

const selectFile = async (groupId: string, fileName: string, buf: Buffer) => {
  const item = getOrInit(groupId);
  const epub = await parseEpub(fileName, buf);
  runInAction(() => {
    item.epub = epub;
    item.uploadDone = false;
    item.segments = [
      { name: 'fileinfo', status: 'pending' },
      ...epub.fileInfo.segments.map((v) => ({
        name: v.id,
        status: 'pending',
      } as SegmentUploadStatus)),
      { name: 'trxcheck', status: 'pending' },
    ];
  });
};

const doUpload = (groupId: string) => {
  const item = getOrInit(groupId);

  const epub = item?.epub;
  if (item.uploading || !epub) {
    return;
  }

  runLoading(
    (l) => { item.uploading = l; },
    async () => {
      const fileinfoContent = Buffer.from(JSON.stringify(epub.fileInfo));
      const data = {
        type: 'Add',
        object: {
          type: 'File',
          name: 'fileinfo',
          file: {
            compression: 0,
            mediaType: 'application/json',
            content: fileinfoContent.toString('base64'),
          },
        },
        target: {
          id: groupId,
          type: 'Group',
        },
      };
      const changeStatus = action((name: string, status: SegmentUploadStatus['status']) => {
        item.segments.find((v) => v.name === name)!.status = status;
      });

      changeStatus('fileinfo', 'uploading');
      const fileInfoTrx = await postContent(data as any);
      await checkTrx(groupId, fileInfoTrx.trx_id);
      changeStatus('fileinfo', 'done');

      const jobs = epub.segments.map((seg) => async () => {
        const segData = {
          type: 'Add',
          object: {
            type: 'File',
            name: seg.id,
            file: {
              compression: 0,
              mediaType: 'application/octet-stream',
              content: seg.buf.toString('base64'),
            },
          },
          target: {
            id: groupId,
            type: 'Group',
          },
        };
        changeStatus(seg.id, 'uploading');
        const segTrx = await postContent(segData as any);
        await checkTrx(groupId, segTrx.trx_id);
        changeStatus(seg.id, 'done');
      });
      await promiseAllSettledThrottle(jobs, 20);

      changeStatus('trxcheck', 'uploading');
      for (let i = 0; i < 30; i += 1) {
        await parseNewTrx(groupId);
        const theBook = state.bookMap.get(groupId)!.find((v) => v.trxId === fileInfoTrx.trx_id);
        await sleep(1000);
        if (theBook) {
          break;
        }
      }
      changeStatus('trxcheck', 'done');

      runInAction(() => {
        item.uploadDone = true;
        const epub = state.bookMap.get(groupId)!.find((v) => v.trxId === fileInfoTrx.trx_id);
        item.recentUploadBook = epub ?? null;
      });
    },
  );
};

const parseNewTrx = action((groupId: string) => {
  let p = state.parseAllTrxPromiseMap.get(groupId);
  if (p) { return p; }
  const run = async () => {
    const [booksToCaculate, lastTrxItem] = await dbService.db.transaction(
      'r',
      [dbService.db.groupLatestParsedTrx, dbService.db.book, dbService.db.bookSegment],
      async () => {
        const [dbBooks, lastTrxItem] = await Promise.all([
          dbService.db.book.where({ groupId, status: 'incomplete' }).toArray(),
          dbService.db.groupLatestParsedTrx.where({ groupId }).last(),
        ]);

        const segments = await dbService.db.bookSegment.where({
          groupId,
        }).toArray();

        const books = dbBooks.map((v) => ({
          ...v,
          file: null as null | Buffer,
          segmentItem: segments.find((s) => s.bookTrx === v.bookTrx) ?? {
            bookTrx: v.bookTrx,
            segments: {},
            groupId,
          },
        }));

        return [books, lastTrxItem];
      },
    );

    const lastTrx = lastTrxItem?.trxId ?? '';

    let nextTrx = lastTrx;
    for (;;) {
      const res = await fetchContents(groupId, {
        num: 100,
        starttrx: nextTrx,
        includestarttrx: !nextTrx,
      });
      if (!res || !res.length) { break; }
      for (const trx of res) {
        const isFileInfo = trx.Content.type === 'File' && trx.Content.name === 'fileinfo';
        const isSegment = trx.Content.type === 'File'
          && /^seg-\d+$/.test(trx.Content.name ?? '')
          && trx.Content.file.mediaType === 'application/octet-stream';

        if (isFileInfo) {
          const fileData: FileInfo = JSON.parse(Buffer.from(trx.Content.file.content, 'base64').toString());
          booksToCaculate.push({
            bookTrx: trx.TrxId,
            date: new Date(trx.TimeStamp / 1000000),
            fileInfo: fileData,
            status: 'incomplete',
            file: null,
            groupId,
            segmentItem: {
              bookTrx: trx.TrxId,
              groupId,
              segments: {},
            },
          });
        }

        if (isSegment) {
          const name = trx.Content.name;
          const buf = Buffer.from(trx.Content.file.content, 'base64');
          booksToCaculate.forEach((book) => {
            const segment = book.fileInfo.segments.find((v) => v.id === name);
            if (!segment) { return; }
            const sha256 = hashBufferSha256(buf);
            if (segment.sha256 !== sha256) { return; }
            book.segmentItem.segments[name] = {
              id: name,
              sha256,
              buf,
            };
          });
        }
      }
      nextTrx = res.at(-1)!.TrxId;
    }

    booksToCaculate
      .filter((v) => v.fileInfo.segments.length === Object.keys(v.segmentItem.segments).length)
      .forEach((book) => {
        const segments = Object.values(book.segmentItem.segments).map((v) => ({
          ...v,
          num: Number(v.id.replace('seg-', '')),
        }));
        segments.sort((a, b) => a.num - b.num);
        const file = Buffer.concat(segments.map((v) => v.buf));
        const fileSha256 = hashBufferSha256(file);
        if (fileSha256 === book.fileInfo.sha256) {
          book.file = file;
          book.status = 'complete';
        } else {
          book.status = 'broken';
        }
      });

    const booksToWrite = booksToCaculate.map((v) => {
      const { file, segmentItem, ...u } = v;
      return u;
    });
    const segmentsToWrite = booksToCaculate.map((v) => v.segmentItem);
    const bookBuffersToWrite = booksToCaculate.filter((v) => v.file).map((v) => ({
      groupId: v.groupId,
      bookTrx: v.bookTrx,
      file: v.file!,
    }));

    await dbService.db.transaction(
      'rw',
      [
        dbService.db.book,
        dbService.db.bookSegment,
        dbService.db.bookBuffer,
        dbService.db.groupLatestParsedTrx,
      ],
      async () => Promise.all([
        dbService.db.book.bulkPut(booksToWrite),
        dbService.db.bookSegment.bulkPut(segmentsToWrite),
        dbService.db.bookBuffer.bulkPut(bookBuffersToWrite),

        dbService.db.groupLatestParsedTrx.where({
          groupId,
        }).delete().then(() => {
          dbService.db.groupLatestParsedTrx.add({
            groupId,
            trxId: nextTrx,
          });
        }),
      ]),
    );

    const currentBooks = state.bookMap.get(groupId) ?? [];
    booksToCaculate
      .filter((v) => v.file && currentBooks.every((u) => u.trxId !== v.bookTrx))
      .forEach((v) => {
        const item: EpubItem = {
          cover: { type: 'notloaded', value: null } as const,
          date: v.date,
          fileInfo: v.fileInfo,
          trxId: v.bookTrx,
        };
        currentBooks.push(item);
      });

    runInAction(() => {
      state.bookMap.set(groupId, currentBooks);
    });
  };

  p = run().then(action(() => {
    state.parseAllTrxPromiseMap.set(groupId, null);
  }));
  state.parseAllTrxPromiseMap.set(groupId, p);
  return p;
});

const tryLoadBookFromDB = async (groupId: string) => {
  const books = await dbService.db.book.where({ groupId, status: 'complete' }).toArray();
  const currentBooks = state.bookMap.get(groupId) ?? [];

  books
    .filter((v) => currentBooks.every((u) => u.trxId !== v.bookTrx))
    .forEach((v) => {
      const item: EpubItem = {
        cover: { type: 'notloaded', value: null } as const,
        date: v.date,
        fileInfo: v.fileInfo,
        trxId: v.bookTrx,
      };
      currentBooks.push(item);
    });

  runInAction(() => {
    state.bookMap.set(groupId, currentBooks);
  });
};

const parseCover = (groupId: string, bookTrx: string) => {
  const item = state.bookMap.get(groupId)?.find((v) => v.trxId === bookTrx);
  if (!item) { return; }
  if (['loaded', 'loading', 'nocover'].includes(item.cover.type)) {
    return;
  }
  const doParse = async () => {
    try {
      const bookBuffer = await dbService.db.bookBuffer.where({
        groupId,
        bookTrx,
      }).last();
      if (!bookBuffer) {
        return;
      }
      const epub = await parseEpub(item.fileInfo.name, bookBuffer.file);
      const cover = epub.cover;
      runInAction(() => {
        if (!cover) {
          item.cover = { type: 'nocover', value: null };
          return;
        }
        item.cover = { type: 'loaded', value: URL.createObjectURL(new Blob([cover.buffer])) };
      });
    } catch (e) {
      console.error(e);
      runInAction(() => {
        item.cover = { type: 'nocover', value: null };
      });
    }
  };
  runInAction(() => {
    item.cover = { type: 'loading', value: doParse() };
  });
};

const getBookBuffer = async (groupId: string, bookTrx: string) => {
  const key = `${groupId}-${bookTrx}`;
  const cacheItem = state.bookBufferLRUCache.get(key);
  if (cacheItem) {
    runInAction(() => [
      state.bookBufferLRUCache.set(key, {
        ...cacheItem,
        time: Date.now(),
      }),
    ]);
    return cacheItem.buf;
  }
  const bookBufferItem = await dbService.db.bookBuffer.where({
    groupId,
    bookTrx,
  }).last();
  const buffer = bookBufferItem?.file ?? null;
  runInAction(() => {
    if (buffer) {
      state.bookBufferLRUCache.set(key, {
        buf: buffer,
        time: Date.now(),
      });
    }
    const now = Date.now();
    const hour = 1000 * 60 * 60;
    [...state.bookBufferLRUCache.entries()].forEach(([k, v]) => {
      if (now - v.time > hour) {
        state.bookBufferLRUCache.delete(k);
      }
    });
  });
  return buffer;
};

const getHighlights = async (groupId: string, bookTrx: string) => {
  const items = await dbService.db.highlights.where({
    groupId,
    bookTrx,
  }).toArray();
  return items;
};

const saveHighlight = async (groupId: string, bookTrx: string, cfiRange: string) => {
  await dbService.db.transaction('rw', [dbService.db.highlights], async () => {
    const count = await dbService.db.highlights.where({
      groupId,
      bookTrx,
      cfiRange,
    }).count();
    if (count) { return; }
    dbService.db.highlights.add({
      groupId,
      bookTrx,
      cfiRange,
    });
  });
};

const deleteHighlight = async (groupId: string, bookTrx: string, cfiRange: string) => {
  await dbService.db.highlights.where({
    groupId,
    bookTrx,
    cfiRange,
  }).delete();
};

const getReadingProgress = async (groupId: string, bookTrx?: string) => {
  const item = await dbService.db.readingProgress.where({
    groupId,
    ...bookTrx ? { bookTrx } : {},
  }).last();
  return item ?? null;
};

const saveReadingProgress = async (groupId: string, bookTrx: string, readingProgress: string) => {
  await dbService.db.transaction('rw', [dbService.db.readingProgress], async () => {
    await dbService.db.readingProgress.where({
      groupId,
      bookTrx,
    }).delete();
    dbService.db.readingProgress.add({
      groupId,
      bookTrx,
      readingProgress,
    });
  });
};

export const init = () => {
  const dispose = busService.on('group_leave', (v) => {
    const groupId = v.data.groupId;
    state.uploadMap.delete(groupId);
    state.bookMap.delete(groupId);
    state.highlightMap.delete(groupId);
    state.parseAllTrxPromiseMap.delete(groupId);
  });
  return dispose;
};

export const epubService = {
  state,
  init,

  getOrInit,
  selectFile,
  doUpload,
  parseNewTrx,
  tryLoadBookFromDB,
  parseCover,
  getBookBuffer,
  getHighlights,
  saveHighlight,
  deleteHighlight,
  getReadingProgress,
  saveReadingProgress,
};
