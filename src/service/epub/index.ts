import { action, observable, runInAction } from 'mobx';
import * as J from 'fp-ts/lib/Json';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/function';
import { fetchContents, IPostContentResult, postContent } from '~/apis';
import { promiseAllSettledThrottle, runLoading, sleep } from '~/utils';
import { dbService, FileInfo } from '~/service/db';
import { busService } from '~/service/bus';
import { parseEpub, ParsedEpubBook, checkTrxAndAck, EpubItem, hashBufferSha256 } from './helper';

export * from './helper';

interface UploadStatusItem {
  name: string
  status: 'pending' | 'uploading' | 'done'
}

interface GroupUploadState {
  epub: ParsedEpubBook | null
  uploading: boolean
  uploadDone: boolean
  progress: Array<UploadStatusItem>
  recentUploadBook: EpubItem | null
}

interface GroupStateItem {
  upload: GroupUploadState
  books: Array<EpubItem>
  trxParsinsPromise: null | Promise<unknown>
}

const state = observable({
  groupMap: new Map<string, GroupStateItem>(),
  bookBufferLRUCache: new Map<string, { buf: Uint8Array, time: number }>(),

  currentBookItem: null as null | EpubItem,
});

const getGroupItem = action((groupId: string) => {
  let item = state.groupMap.get(groupId);
  if (!item) {
    item = observable({
      upload: {
        epub: null,
        uploading: false,
        uploadDone: false,
        progress: [],
        recentUploadBook: null,
      },
      books: [],
      highlights: [],
      trxParsinsPromise: null,
    });
    state.groupMap.set(groupId, item);
  }
  return item;
});

const resetUploadState = action((groupId: string) => {
  const groupItem = getGroupItem(groupId);
  groupItem.upload = {
    epub: null,
    uploading: false,
    uploadDone: false,
    progress: [],
    recentUploadBook: groupItem.upload.recentUploadBook,
  };
  return groupItem.upload;
});

const selectFile = async (groupId: string, fileName: string, fileBuffer: Buffer) => {
  const uploadState = getGroupItem(groupId).upload;
  const epub = await parseEpub(fileName, fileBuffer);
  return pipe(
    epub,
    E.map((epub) => {
      runInAction(() => {
        uploadState.epub = epub;
        uploadState.uploading = false;
        uploadState.uploadDone = false;
        uploadState.progress = [
          { name: 'fileinfo', status: 'pending' },
          ...epub.fileInfo.segments.map((v) => ({
            name: v.id,
            status: 'pending',
          } as UploadStatusItem)),
          { name: 'trxcheck', status: 'pending' },
        ];
      });
      return null;
    }),
  );
};

const doUpload = (groupId: string) => {
  const groupItem = getGroupItem(groupId);
  const uploadState = groupItem.upload;
  const epub = uploadState?.epub;
  if (uploadState.uploading || !epub) { return; }

  runLoading(
    (l) => { uploadState.uploading = l; },
    async () => {
      const changeProgressStatus = action((name: string, status: UploadStatusItem['status']) => {
        const progressItem = uploadState.progress.find((v) => v.name === name);
        if (!progressItem) {
          throw new Error(`trying setting progress for ${name} which doesn't exist`);
        }
        progressItem.status = status;
      });

      const fileinfoContent = Buffer.from(JSON.stringify(epub.fileInfo));
      const fileInfoPostData = {
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

      let fileInfoTrx: IPostContentResult;

      await runLoading(
        (l) => changeProgressStatus('fileinfo', l ? 'uploading' : 'done'),
        async () => {
          fileInfoTrx = await postContent(fileInfoPostData as any);
          await checkTrxAndAck(groupId, fileInfoTrx.trx_id);
        },
      );

      const segTasks = epub.segments.map((seg) => async () => {
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

        await runLoading(
          (l) => changeProgressStatus(seg.id, l ? 'uploading' : 'done'),
          async () => {
            const segTrx = await postContent(segData as any);
            await checkTrxAndAck(groupId, segTrx.trx_id);
          },
        );
      });
      await promiseAllSettledThrottle(segTasks, 20);

      await runLoading(
        (l) => changeProgressStatus('trxcheck', l ? 'uploading' : 'done'),
        async () => {
          for (let i = 0; i < 30; i += 1) {
            await parseNewTrx(groupId);
            const theBook = groupItem.books.find((v) => v.trxId === fileInfoTrx.trx_id);
            await sleep(1000);
            if (theBook) {
              break;
            }
          }
        },
      );

      runInAction(() => {
        uploadState.uploadDone = true;
        const epub = groupItem.books.find((v) => v.trxId === fileInfoTrx.trx_id);
        uploadState.recentUploadBook = epub ?? null;
      });
    },
  );
};

const parseNewTrx = action((groupId: string) => {
  const groupItem = getGroupItem(groupId);
  let p = groupItem.trxParsinsPromise;
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
        const isEpubMetadata = trx.Content.type === 'Note'
          && trx.Content.name === 'epubMetadata';

        if (isFileInfo) {
          try {
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
          } catch (e) {
            console.error(e);
          }
        }

        if (isSegment) {
          const name = trx.Content.name;
          const buf = Buffer.from(trx.Content.file.content, 'base64');
          const sha256 = hashBufferSha256(buf);
          booksToCaculate.forEach((book) => {
            const segment = book.fileInfo.segments.find((v) => v.id === name);
            if (!segment) { return; }
            if (segment.sha256 !== sha256) { return; }
            book.segmentItem.segments[name] = {
              id: name,
              sha256,
              buf,
            };
          });
        }

        if (isEpubMetadata) {
          const content = trx.Content.content;
          const metadata = J.parse(content);
          if (E.isRight(metadata)) {
            const item = {
              groupId,
              bookTrx: trx.Content.id,
              metadata: metadata.right,
            };
            await dbService.db.transaction('rw', [dbService.db.bookMetadata], async () => {
              await dbService.db.bookMetadata.add(item);
            });
          }
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

    const currentBooks = groupItem.books;
    runInAction(() => {
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
    });
  };

  p = run().then(action(() => {
    groupItem.trxParsinsPromise = null;
  }));
  groupItem.trxParsinsPromise = p;
  return p;
});

const tryLoadBookFromDB = async (groupId: string) => {
  const groupItem = getGroupItem(groupId);
  const books = await dbService.db.book.where({ groupId, status: 'complete' }).toArray();
  const currentBooks = groupItem.books;

  runInAction(() => {
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
  });
};

const parseCover = (groupId: string, bookTrx: string) => {
  const groupItem = getGroupItem(groupId);
  const item = groupItem.books.find((v) => v.trxId === bookTrx);
  if (!item) { return; }
  if (['loaded', 'loading', 'nocover'].includes(item.cover.type)) {
    return;
  }
  const doParse = async () => {
    let cover: EpubItem['cover'];
    const bookBuffer = await getBookBuffer(groupId, bookTrx);
    if (O.isNone(bookBuffer)) { return; }
    const epub = await parseEpub('', bookBuffer.value);
    if (E.isLeft(epub)) {
      console.error(epub.left);
    }
    if (E.isLeft(epub) || !epub.right.cover) {
      cover = { type: 'nocover', value: null };
    } else {
      cover = { type: 'loaded', value: URL.createObjectURL(new Blob([epub.right.cover.buffer])) };
    }
    runInAction(() => {
      item.cover = cover;
    });
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
    return O.some(cacheItem.buf);
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
  if (buffer) {
    return O.some(buffer);
  }
  return O.none;
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

const init = () => {
  const dispose = busService.on('group_leave', (v) => {
    const groupId = v.data.groupId;
    state.groupMap.delete(groupId);
  });
  return dispose;
};

export const epubService = {
  state,
  init,

  getGroupItem,
  resetUploadState,
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
