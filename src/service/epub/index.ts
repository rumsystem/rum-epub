import { action, observable, reaction, runInAction } from 'mobx';
import * as J from 'fp-ts/lib/Json';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/function';
import { fetchContents, IPostContentResult, postContent } from '~/apis';
import { createPromise, PollingTask, promiseAllSettledThrottle, runLoading, sleep } from '~/utils';
import { dbService, FileInfo, CoverFileInfo, EpubMetadata, BookMetadataItem } from '~/service/db';
import { busService } from '~/service/bus';
import { parseEpub, ParsedEpubBook, checkTrxAndAck, GroupBookItem, hashBufferSha256, splitFile } from './helper';
import { createHash } from 'crypto';
import { nodeService } from '../node';

export * from './helper';

interface UploadStatusItem {
  name: string
  status: 'pending' | 'uploading' | 'done'
}

interface GroupUploadState {
  epub: {
    epub: ParsedEpubBook | null
    uploading: boolean
    uploadDone: boolean
    progress: Array<UploadStatusItem>
    recentUploadBook: GroupBookItem | null
  }
  cover: {
    file: ArrayBuffer | null
    bookTrx: string
    sha256: string
    src: string
    segments: Array<{ id: string, sha256: string, buf: Buffer }>
    uploading: boolean
    uploadDone: boolean
    progress: Array<UploadStatusItem>
  }
}

interface GroupStateItem {
  upload: GroupUploadState
  books: Array<GroupBookItem>
  loadAndParseBooksPromise: null | Promise<unknown>
  loadBooksPromise: null | Promise<unknown>
}

export const GROUP_ORDER_STORAGE_KEY = 'GROUP_ORDER_STORAGE_KEY';

const state = observable({
  current: {
    groupId: '',
    bookTrx: '',
  },
  groupMap: new Map<string, GroupStateItem>(),
  bookBufferLRUCache: new Map<string, { buf: Uint8Array, time: number }>(),
  groupOrder: [] as Array<string>,

  polling: null as null | PollingTask,
});

const getGroupItem = action((groupId: string) => {
  let item = state.groupMap.get(groupId);
  if (!item) {
    item = observable({
      upload: {
        epub: {
          epub: null,
          uploading: false,
          uploadDone: false,
          progress: [],
          recentUploadBook: null,
        },
        cover: {
          file: null,
          bookTrx: '',
          sha256: '',
          src: '',
          segments: [],
          uploading: false,
          uploadDone: false,
          progress: [],
        },
      },
      books: [],
      highlights: [],
      loadAndParseBooksPromise: null,
      loadBooksPromise: null,
    } as GroupStateItem);
    state.groupMap.set(groupId, item);
  }
  return item;
});

const upload = {
  resetEpub: action((groupId: string) => {
    const groupItem = getGroupItem(groupId);
    groupItem.upload = {
      ...groupItem.upload,
      epub: {
        epub: null,
        uploading: false,
        uploadDone: false,
        progress: [],
        recentUploadBook: groupItem.upload.epub.recentUploadBook,
      },
    };
    return groupItem.upload;
  }),
  resetCover: action((groupId: string) => {
    const groupItem = getGroupItem(groupId);
    if (groupItem.upload.cover.src) {
      URL.revokeObjectURL(groupItem.upload.cover.src);
    }
    groupItem.upload = {
      ...groupItem.upload,
      cover: {
        file: null,
        bookTrx: '',
        sha256: '',
        src: '',
        segments: [],
        uploading: false,
        uploadDone: false,
        progress: [],
      },
    };
    return groupItem.upload;
  }),
  selectEpub: async (groupId: string, fileName: string, fileBuffer: Buffer) => {
    const uploadState = getGroupItem(groupId).upload;
    const epub = await parseEpub(fileName, fileBuffer);
    return pipe(
      epub,
      E.map((epub) => {
        runInAction(() => {
          uploadState.epub = {
            ...uploadState.epub,
            epub,
            uploading: false,
            uploadDone: false,
            progress: [
              { name: 'fileinfo', status: 'pending' },
              ...epub.fileInfo.segments.map((v) => ({
                name: v.id,
                status: 'pending',
              } as UploadStatusItem)),
              { name: 'trxcheck', status: 'pending' },
            ],
          };
        });
        return null;
      }),
    );
  },
  doUploadEpub: (groupId: string) => {
    const groupItem = getGroupItem(groupId);
    const uploadState = groupItem.upload.epub;
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
              await loadAndParseBooks(groupId);
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
  },
  selectCover: (groupId: string, bookTrx: string, file: ArrayBuffer) => {
    const uploadState = getGroupItem(groupId).upload;
    const segments = splitFile(Buffer.from(file));
    runInAction(() => {
      const src = URL.createObjectURL(new Blob([file]));
      uploadState.cover = {
        file,
        bookTrx,
        sha256: '',
        src,
        segments,
        progress: [
          { name: 'fileinfo', status: 'pending' },
          ...segments.map((v) => ({
            name: v.id,
            status: 'pending',
          } as UploadStatusItem)),
          { name: 'trxcheck', status: 'pending' },
        ],
        uploadDone: false,
        uploading: false,
      };
    });
  },
  doUploadCover: (groupId: string) => {
    const groupItem = getGroupItem(groupId);
    const uploadState = groupItem.upload.cover;
    const imagearrayBuffer = uploadState.file;
    if (uploadState.uploading || !imagearrayBuffer) { return; }

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

        const segHash = createHash('sha256');
        segHash.update(Buffer.from(imagearrayBuffer));
        const imageSha256 = segHash.digest('hex');

        const fileinfoContent = Buffer.from(JSON.stringify({
          mediaType: 'image/jpeg',
          name: 'epub-cover-image',
          bookTrx: uploadState.bookTrx,
          sha256: imageSha256,
          segments: uploadState.segments.map((v) => ({
            id: v.id,
            sha256: v.sha256,
          })),
        }));
        const fileInfoPostData = {
          type: 'Add',
          object: {
            type: 'File',
            name: 'fileinfocover',
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

        const segTasks = uploadState.segments.map((seg) => async () => {
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
              await loadAndParseBooks(groupId);
              const coverCount = await dbService.db.cover.where({
                coverTrx: fileInfoTrx.trx_id,
              }).count();
              await sleep(1000);
              if (coverCount) {
                break;
              }
            }
          },
        );

        runInAction(() => {
          uploadState.uploadDone = true;
        });
        parseMetadataAndCover(groupId, uploadState.bookTrx);
      },
    );
  },
};

const highlight = {
  get: async (groupId: string, bookTrx: string) => {
    const items = await dbService.db.highlights.where({
      groupId,
      bookTrx,
    }).toArray();
    return items;
  },

  save: async (groupId: string, bookTrx: string, cfiRange: string) => {
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
  },

  delete: async (groupId: string, bookTrx: string, cfiRange: string) => {
    await dbService.db.highlights.where({
      groupId,
      bookTrx,
      cfiRange,
    }).delete();
  },
};

const readingProgress = {
  getLast: async (groupId: string, bookTrx?: string) => {
    const item = await dbService.db.readingProgress.where({
      groupId,
      ...bookTrx ? { bookTrx } : {},
    }).last();
    return item ?? null;
  },
  getAll: async (groupId: string, bookTrx?: string) => {
    const items = await dbService.db.readingProgress.where({
      groupId,
      ...bookTrx ? { bookTrx } : {},
    }).toArray();
    return items;
  },
  save: async (groupId: string, bookTrx: string, readingProgress: string) => {
    await dbService.db.transaction('rw', [dbService.db.readingProgress], async () => {
      await dbService.db.readingProgress.where({
        groupId,
        bookTrx,
      }).delete();
      await dbService.db.readingProgress.add({
        groupId,
        bookTrx,
        readingProgress,
      });
    });
  },
};

const openBook = action((groupId: string | null, bookTrx?: string) => {
  state.current = {
    groupId: groupId ?? '',
    bookTrx: bookTrx ?? '',
  };
});

const updateBookLastOpenTime = async (groupId: string, bookTrx: string) => {
  const groupItem = getGroupItem(groupId);
  const book = groupItem.books.find((v) => v.trxId === bookTrx);
  const now = Date.now();
  if (book) {
    runInAction(() => {
      book.openTime = now;
    });
  }
  await dbService.db.book.where({
    groupId,
    bookTrx,
  }).modify({
    openTime: now,
  });
};

const loadAndParseBooks = action((groupId: string, loadDone?: () => unknown) => {
  const groupItem = getGroupItem(groupId);
  let p = groupItem.loadAndParseBooksPromise;
  if (groupItem.loadBooksPromise) {
    groupItem.loadBooksPromise.then(() => loadDone?.());
  }
  if (p) { return p; }
  const run = async () => {
    // load existed book in db
    const p = createPromise();
    runInAction(() => { groupItem.loadBooksPromise = p.p; });
    const existedBooks = await dbService.db.book.where({ groupId, status: 'complete' }).toArray();
    runInAction(() => {
      existedBooks
        .filter((v) => groupItem.books.every((u) => u.trxId !== v.bookTrx))
        .forEach((v) => {
          const item: GroupBookItem = {
            metadata: null,
            cover: null,
            metadataAndCoverType: 'notloaded',
            metadataAndCoverPromise: null,
            size: v.size,
            time: v.time,
            openTime: v.openTime,
            fileInfo: v.fileInfo,
            trxId: v.bookTrx,
          };
          groupItem.books.push(item);
          parseMetadataAndCover(groupId, v.bookTrx);
        });
    });
    p.rs();
    loadDone?.();

    // if latest trx already parsed
    const lastTrxItem = await dbService.db.groupLatestParsedTrx.where({ groupId }).last();
    const lastTrx = lastTrxItem?.trxId ?? '';
    if (nodeService.state.groupMap[groupId]?.highest_block_id === lastTrx) {
      return;
    }

    // parse new book from trxs
    const [dbBooks, dbBookSegments, dbCovers, dbCoverSegments] = await dbService.db.transaction(
      'r',
      [
        dbService.db.book,
        dbService.db.bookSegment,
        dbService.db.cover,
        dbService.db.coverSegment,
      ],
      async () => {
        const [dbBooks, dbBookSegments, dbCovers, dbCoverSegments] = await Promise.all([
          dbService.db.book.where({ groupId, status: 'incomplete' }).toArray(),
          dbService.db.bookSegment.where({ groupId }).toArray(),
          dbService.db.cover.where({ groupId }).toArray(),
          dbService.db.coverSegment.where({ groupId }).toArray(),
        ]);
        return [dbBooks, dbBookSegments, dbCovers, dbCoverSegments];
      },
    );

    const parseState = {
      book: dbBooks.map((v) => ({
        book: v,
        file: null as null | Buffer,
        segment: dbBookSegments.find((s) => s.bookTrx === v.bookTrx) ?? {
          bookTrx: v.bookTrx,
          segments: {},
          groupId,
        },
      })),
      cover: dbCovers.map((v) => ({
        cover: v,
        file: null as null | Buffer,
        segment: dbCoverSegments.find((s) => s.coverTrx === v.coverTrx) ?? {
          coverTrx: v.coverTrx,
          segments: {},
          groupId,
        },
      })),
      metadata: [] as Array<BookMetadataItem>,
    };

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
        const isCoverFileInfo = trx.Content.type === 'File' && trx.Content.name === 'fileinfocover';
        const isSegment = trx.Content.type === 'File'
          && /^seg-\d+$/.test(trx.Content.name ?? '')
          && trx.Content.file.mediaType === 'application/octet-stream';
        const isEpubMetadata = trx.Content.type === 'Note'
          && trx.Content.name === 'epubMetadata';

        if (isFileInfo) {
          try {
            const fileData: FileInfo = JSON.parse(Buffer.from(trx.Content.file.content, 'base64').toString());
            const fileInfoExisted = parseState.book.some((v) => v.book.fileInfo.sha256 === fileData.sha256);
            parseState.book.push({
              book: {
                bookTrx: trx.TrxId,
                fileInfo: fileData,
                size: 0,
                status: fileInfoExisted
                  ? 'broken'
                  : 'incomplete',
                groupId,
                time: trx.TimeStamp / 1000000,
                openTime: 0,
              },
              file: null,
              segment: {
                bookTrx: trx.TrxId,
                groupId,
                segments: {},
              },
            });
          } catch (e) {
            console.error(e);
          }
        }

        if (isCoverFileInfo) {
          try {
            const fileinfo: CoverFileInfo = JSON.parse(Buffer.from(trx.Content.file.content, 'base64').toString());
            parseState.cover.push({
              cover: {
                coverTrx: trx.TrxId,
                fileInfo: fileinfo,
                bookTrx: fileinfo.bookTrx,
                groupId,
                status: 'incomplete',
              },
              file: null,
              segment: {
                coverTrx: trx.TrxId,
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
          parseState.book.forEach((v) => {
            if (v.book.status !== 'incomplete') { return; }
            const segment = v.book.fileInfo.segments.find((v) => v.id === name);
            if (!segment || segment.sha256 !== sha256) { return; }
            v.segment.segments[name] = {
              id: name,
              sha256,
              buf,
            };
          });
          parseState.cover.forEach((v) => {
            const segment = v.cover.fileInfo?.segments.find((v) => v.id === name);
            if (!segment || segment.sha256 !== sha256) { return; }
            v.segment.segments[name] = {
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
            parseState.metadata.push({
              groupId,
              bookTrx: trx.Content.id,
              metadata: metadata.right as any,
            });
          } else {
            console.error(metadata.left);
          }
        }
      }
      nextTrx = res.at(-1)!.TrxId;
    }

    // combine book segments
    parseState.book
      // have enough segments
      .filter((v) => v.book.fileInfo.segments.length === Object.keys(v.segment.segments).length)
      .forEach((item) => {
        const segments = Object.values(item.segment.segments).map((v) => ({
          ...v,
          num: Number(v.id.replace('seg-', '')),
        }));
        segments.sort((a, b) => a.num - b.num);
        const file = Buffer.concat(segments.map((v) => v.buf));
        const fileSha256 = hashBufferSha256(file);
        if (fileSha256 === item.book.fileInfo.sha256) {
          item.file = file;
          item.book.status = 'complete';
        } else {
          item.book.status = 'broken';
        }
      });

    // parse completed books
    const completedBooks = parseState.book.filter((v) => v.book.status === 'complete');
    for (const v of completedBooks) {
      v.book.size = v.file?.length ?? 0;
      const epub = await parseEpub('', v.file!);
      if (E.isLeft(epub)) { return; }
      if (epub.right.cover) {
        parseState.cover.push({
          cover: {
            bookTrx: v.book.bookTrx,
            coverTrx: '',
            fileInfo: null,
            groupId,
            status: 'complete',
          },
          file: epub.right.cover,
          segment: {
            coverTrx: '',
            groupId,
            segments: {},
          },
        });
      }
      if (epub.right.metadata) {
        parseState.metadata.push({
          bookTrx: v.book.bookTrx,
          groupId,
          metadata: epub.right.metadata,
        });
      }
    }

    parseState.cover
      .filter((v) => v.cover.fileInfo?.segments.length === Object.keys(v.segment.segments).length)
      .forEach((item) => {
        const segments = Object.values(item.segment.segments).map((v) => ({
          ...v,
          num: Number(v.id.replace('seg-', '')),
        }));
        segments.sort((a, b) => a.num - b.num);
        const file = Buffer.concat(segments.map((v) => v.buf));
        const fileSha256 = hashBufferSha256(file);
        if (fileSha256 === item.cover.fileInfo?.sha256) {
          item.file = file;
          item.cover.status = 'complete';
        } else {
          item.cover.status = 'broken';
        }
      });

    const completedCovers = parseState.cover.filter((v) => v.cover.status === 'complete');
    const booksToWrite = parseState.book.map((v) => v.book);
    const coversToWrite = parseState.cover.map((v) => v.cover);
    const segmentsToWrite = parseState.book
      .filter((v) => v.book.status !== 'complete')
      .map((v) => v.segment);
    const coverSegmentsToWrite = parseState.cover
      .filter((v) => v.cover.status !== 'complete')
      .map((v) => v.segment);
    const segmentsIdsToDelete = completedBooks
      .map((v) => v.segment.id)
      .filter(<T>(v: T | undefined): v is T => typeof v === 'number');
    const coverSegmentsIdsToDelete = completedCovers
      .map((v) => v.segment.id)
      .filter(<T>(v: T | undefined): v is T => typeof v === 'number');
    const bookBuffersToWrite = parseState.book.filter((v) => v.file).map((v) => ({
      groupId: v.book.groupId,
      bookTrx: v.book.bookTrx,
      file: v.file!,
    }));
    const coverBuffersToWrite = parseState.cover.filter((v) => v.file).map((v) => ({
      groupId: v.cover.groupId,
      bookTrx: v.cover.bookTrx,
      coverTrx: v.cover.coverTrx,
      file: v.file!,
    }));

    await dbService.db.transaction(
      'rw',
      [
        dbService.db.book,
        dbService.db.bookSegment,
        dbService.db.bookBuffer,
        dbService.db.bookMetadata,
        dbService.db.cover,
        dbService.db.coverSegment,
        dbService.db.coverBuffer,
        dbService.db.groupLatestParsedTrx,
      ],
      async () => Promise.all([
        dbService.db.book.bulkPut(booksToWrite),
        dbService.db.cover.bulkPut(coversToWrite),

        dbService.db.bookSegment.bulkPut(segmentsToWrite),
        dbService.db.coverSegment.bulkPut(coverSegmentsToWrite),

        dbService.db.bookBuffer.bulkPut(bookBuffersToWrite),
        dbService.db.coverBuffer.bulkPut(coverBuffersToWrite),

        dbService.db.bookSegment.bulkDelete(segmentsIdsToDelete),
        dbService.db.coverSegment.bulkDelete(coverSegmentsIdsToDelete),

        dbService.db.bookMetadata.bulkPut(parseState.metadata),
        dbService.db.groupLatestParsedTrx.where({ groupId }).delete().then(() => {
          dbService.db.groupLatestParsedTrx.add({
            groupId,
            trxId: nextTrx,
          });
        }),
      ]),
    );

    // update state
    runInAction(() => {
      parseState.book
        .filter((v) => v.file && groupItem.books.every((u) => u.trxId !== v.book.bookTrx))
        .forEach((v) => {
          const item: GroupBookItem = {
            metadata: null,
            cover: null,
            metadataAndCoverType: 'notloaded',
            metadataAndCoverPromise: null,
            size: v.book.size,
            fileInfo: v.book.fileInfo,
            trxId: v.book.bookTrx,
            time: v.book.time,
            openTime: v.book.openTime,
          };
          groupItem.books.push(item);
          parseMetadataAndCover(groupId, v.book.bookTrx);
        });
    });
  };

  p = run().then(action(() => {
    groupItem.loadAndParseBooksPromise = null;
    groupItem.loadBooksPromise = null;
  }));
  groupItem.loadAndParseBooksPromise = p;
  return p;
});

const parseMetadataAndCover = async (groupId: string, bookTrx: string) => {
  const groupItem = getGroupItem(groupId);
  const item = groupItem.books.find((v) => v.trxId === bookTrx);
  if (!item) { return; }

  await loadAndParseBooks(groupId);

  const doParse = async () => {
    let cover: string | null = null;
    let metadata: EpubMetadata | null = null;

    await dbService.db.transaction(
      'r',
      [
        dbService.db.bookMetadata,
        dbService.db.coverBuffer,
      ],
      async () => {
        const [bookMetadata, coverBuffer] = await Promise.all([
          dbService.db.bookMetadata.where({
            groupId,
            bookTrx,
          }).last(),
          dbService.db.coverBuffer.where({
            groupId,
            bookTrx,
          }).last(),
        ]);
        if (coverBuffer) {
          cover = URL.createObjectURL(new Blob([coverBuffer.file]));
        }
        metadata = bookMetadata?.metadata ?? null;
      },
    );

    if (!cover || !metadata) {
      const bookBuffer = await getBookBuffer(groupId, bookTrx);
      if (O.isNone(bookBuffer)) { return; }
      const epub = await parseEpub('', bookBuffer.value);
      if (E.isLeft(epub)) {
        console.error(epub.left);
        runInAction(() => {
          cover = null;
          metadata = null;
        });
        return;
      }
      if (!cover && epub.right.cover) {
        cover = URL.createObjectURL(new Blob([epub.right.cover]));
      }
      if (!metadata && epub.right.metadata) {
        metadata = epub.right.metadata;
      }
    }

    runInAction(() => {
      if (item.cover) {
        URL.revokeObjectURL(item.cover);
      }
      item.cover = cover;
      item.metadataAndCoverType = 'loaded';
      item.metadata = metadata;
    });
  };

  if (item.metadataAndCoverPromise) {
    return item.metadataAndCoverPromise;
  }

  const p = doParse();
  runInAction(() => {
    item.metadataAndCoverType = 'loading';
    item.metadataAndCoverPromise = p;
  });
  return p;
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

const init = () => {
  state.groupOrder = pipe(
    J.parse(localStorage.getItem(GROUP_ORDER_STORAGE_KEY) ?? ''),
    E.map((v) => (Array.isArray(v) ? v as Array<string> : [])),
    E.getOrElse(() => [] as Array<string>),
  );

  const disposes = [
    busService.on('group_leave', (v) => {
      const groupId = v.data.groupId;
      state.groupMap.delete(groupId);
      if (state.current.groupId === groupId) {
        state.current.groupId = nodeService.state.groups.at(0)?.group_id ?? '';
      }
    }),

    reaction(
      () => state.current.groupId,
      action(() => {
        const index = state.groupOrder.indexOf(state.current.groupId);
        if (index !== -1) {
          state.groupOrder.splice(index, 1);
        }
        state.groupOrder.unshift(state.current.groupId);
        const newOrder = state.groupOrder.filter((v) => nodeService.state.groups.some((u) => u.group_id === v));
        nodeService.state.groups.forEach((v) => {
          if (!newOrder.includes(v.group_id)) {
            newOrder.push(v.group_id);
          }
        });
        state.groupOrder = newOrder;
        localStorage.setItem(GROUP_ORDER_STORAGE_KEY, JSON.stringify(newOrder));
      }),
    ),
  ];
  return () => disposes.forEach((v) => v());
};

const initAfterDB = () => {
  state.polling = new PollingTask(
    async () => {
      for (const group of nodeService.state.groups) {
        await loadAndParseBooks(group.group_id);
      }
    },
    30000,
    true,
  );

  dbService.db.readingProgress.toCollection().last().then((v) => {
    if (v) {
      openBook(v.groupId, v.bookTrx);
    }
  });

  const disposes = [
    // load books for new group
    reaction(
      () => nodeService.state.groups.map((v) => v.group_id),
      async () => {
        for (const group of nodeService.state.groups) {
          const groupItem = getGroupItem(group.group_id);
          if (!groupItem.books.length) {
            await loadAndParseBooks(group.group_id);
          }
        }
      },
      { fireImmediately: true },
    ),
  ];

  return () => disposes.forEach((v) => v());
};

export const epubService = {
  state,
  init,
  initAfterDB,

  getGroupItem,

  upload,
  highlight,
  readingProgress,

  openBook,
  updateBookLastOpenTime,
  loadAndParseBooks,
  parseMetadataAndCover,
  getBookBuffer,
};
