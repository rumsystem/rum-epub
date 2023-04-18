import { either, function as fp, taskEither } from 'fp-ts';
import { action, observable, runInAction, when } from 'mobx';
import { formatISO } from 'date-fns';
import { v4 } from 'uuid';
import { BookMetadata, BookSummary, CoverBuffer, dbService } from '~/service/db';
import { nodeService } from '~/service/node';
import type {
  BookMetadataActivity, BookSummaryActivity, BookSummaryContent, BookSegmentActivity,
  CoverSummaryActivity, CoverSummaryContent, CoverSegmentActivity,
} from '~/service/polling';
import { fetchTrx, postContent } from '~/apis';
import { sleep, parseEpub, FileInfo, EpubMetadata, hashBufferSha256, FileSegment, splitFile } from '~/utils';
import { busService } from '../bus';

interface UploadJob {
  id: number
  groupId: string
  cover: Buffer | null
  fileInfo: FileInfo
  metadata: EpubMetadata
  segments: Array<FileSegment>
  summaryTrxId: string
  size: number
  file: Buffer
  sha256: string
  jobs: Array<{
    activity: any
    trxId: string
    uploading: boolean
    done: boolean
  }>
  uploading: boolean
  done: boolean
  bookId: string
}

interface CoverUploadJob {
  id: number
  groupId: string
  bookId: string
  coverId: string
  file: Buffer | null
  segments: Array<FileSegment>
  summaryTrxId: string
  size: number
  sha256: string
  jobs: Array<{
    activity: any
    trxId: string
    uploading: boolean
    done: boolean
  }>
  uploading: boolean
  done: boolean
}

export interface GroupMapBookItem {
  book: BookSummary
  cover: CoverBuffer | null
  metadata: BookMetadata | null
}

const state = observable({
  current: {
    groupId: '',
    bookId: '',
  },
  groupMap: new Map<string, Array<GroupMapBookItem>>(),
  get groups() {
    return nodeService.state.groups.map((group) => ({
      group,
      books: this.groupMap.get(group.group_id) ?? [],
    }));
  },
  upload: {
    jobs: [] as Array<UploadJob>,
    coverJobs: [] as Array<CoverUploadJob>,
  },
});

const loadBooks = async (groupId?: string) => {
  const loadBookByGroup = async (groupId: string) => {
    const books = await dbService.getBookByGroupId(groupId);
    const covers = await Promise.all(books.map((v) => dbService.getCoverBuffer(groupId, v.id)));
    const metadatas = await Promise.all(books.map((v) => dbService.getBookMetadata(groupId, v.id)));
    runInAction(() => {
      state.groupMap.set(groupId, books.map((v) => ({
        book: v,
        cover: covers.find((u) => u?.bookId === v.id) ?? null,
        metadata: metadatas.find((u) => u?.bookId === v.id) ?? null,
      })));
    });
  };
  if (groupId) { return loadBookByGroup(groupId); }
  await Promise.all(nodeService.state.groups.map((v) => v.group_id).map(loadBookByGroup));
};

const loadBook = async (groupId: string, bookId: string) => {
  const book = await dbService.getBook({ groupId, bookId });
  const cover = await dbService.getCoverBuffer(groupId, bookId);
  const metadata = await dbService.getBookMetadata(groupId, bookId);
  if (!book) { return; }

  runInAction(() => {
    state.groupMap.set(groupId, [
      ...state.groupMap.get(groupId) ?? [],
      {
        book,
        cover: cover ?? null,
        metadata: metadata ?? null,
      },
    ]);
  });
};

const updateCovers = action((coverBuffers: Array<CoverBuffer>) => {
  coverBuffers.forEach((v) => {
    const item = state.groupMap.get(v.groupId)?.find((u) => u.book.id === v.bookId);
    if (item) {
      item.cover = v;
    }
  });
});

const updateBookMetadata = action((items: Array<BookMetadata>) => {
  items.forEach((v) => {
    const item = state.groupMap.get(v.groupId)?.find((u) => u.book.id === v.bookId);
    if (item) {
      item.metadata = v;
    }
  });
});

const openBook = action((groupId: string, bookId: string) => {
  if (state.current.groupId === groupId && state.current.bookId === bookId) {
    return;
  }
  state.current = {
    groupId,
    bookId,
  };
});

const updateBookOpenTime = action((groupId: string, bookId: string, time: number) => {
  const book = state.groupMap.get(groupId)?.find((v) => v.book.id === bookId);
  if (book) {
    book.book.openTime = time;
  }
});

const upload = {
  createJob: (params: { groupId: string, fileName: string, fileBuffer: Buffer }) => {
    const run = fp.pipe(
      () => parseEpub(params.fileName, params.fileBuffer),
      taskEither.mapLeft(() => 'parse failed'),
      taskEither.map((v) => {
        const item: UploadJob = observable({
          id: Date.now(),
          groupId: params.groupId,
          cover: v.cover,
          fileInfo: v.fileInfo,
          metadata: v.metadata,
          segments: v.segments,
          summaryTrxId: '',
          file: params.fileBuffer,
          size: params.fileBuffer.length,
          sha256: hashBufferSha256(params.fileBuffer),
          jobs: [],
          uploading: false,
          done: false,
          bookId: '',
        });
        runInAction(() => {
          state.upload.jobs.push(item);
        });
        return item;
      }),
    );
    return run();
  },
  deleteJob: action((jobId: number) => {
    const jobIndex = state.upload.jobs.findIndex((v) => v.id === jobId);
    const job = state.upload.jobs.at(jobIndex);
    if (job && !job.uploading) {
      state.upload.jobs.splice(jobIndex, 1);
    }
  }),
  startJob: action((jobId: number) => {
    const job = state.upload.jobs.find((v) => v.id === jobId);
    if (!job || job.uploading || job.done) { return; }
    const id = v4();
    job.bookId = id;
    const now = Date.now();
    const activity: BookSummaryActivity = {
      type: 'Create',
      published: formatISO(now),
      object: {
        type: 'BookSummary',
        id,
        name: job.fileInfo.title,
        mediaType: 'application/json',
        content: JSON.stringify({
          size: job.size,
          sha256: job.fileInfo.sha256,
          segments: job.segments.map((v) => v.sha256),
        } satisfies BookSummaryContent),
      },
    };
    job.jobs.push({ activity, trxId: '', uploading: false, done: false });
    job.segments.forEach((v) => {
      const segmentActivity: BookSegmentActivity = {
        type: 'Create',
        object: {
          type: 'BookSegment',
          mediaType: 'application/octet-stream;base64',
          attributedTo: {
            type: 'BookSummary',
            id,
          },
          content: v.buf.toString('base64'),
        },
      };
      job.jobs.push({ activity: segmentActivity, trxId: '', uploading: false, done: false });
    });

    upload._doUploadJob(job);
    when(() => !!job.summaryTrxId).then(async () => {
      try {
        const metadata = await parseEpub('book', job.file);
        if (either.isLeft(metadata)) { return; }
        const userAddress = nodeService.state.groupMap[job.groupId]?.user_eth_addr ?? '';
        await dbService.putBook([{
          id,
          complete: true,
          groupId: job.groupId,
          openTime: 0,
          segments: job.segments.map((v) => ({ sha256: v.sha256 })),
          sha256: job.fileInfo.sha256,
          size: job.size,
          status: 'pending',
          timestamp: now,
          title: job.fileInfo.title,
          trxId: job.summaryTrxId,
          userAddress,
        }]);

        await dbService.putBookBuffer([{
          groupId: job.groupId,
          bookId: id,
          file: job.file,
        }]);

        if (metadata.right.cover) {
          await dbService.putCoverBuffer([{
            groupId: job.groupId,
            bookId: id,
            file: metadata.right.cover,
            coverId: '',
            timestamp: now,
          }]);
        }

        await dbService.putBookMetadata([{
          userAddress,
          bookId: job.bookId,
          groupId: job.groupId,
          trxId: '',
          metadata: metadata.right.metadata,
          timestamp: now,
          status: 'synced',
        }]);
        loadBook(job.groupId, id);
      } catch (e) {
        console.error(e);
      }
    });
  }),

  createCoverJob: (params: { groupId: string, bookId: string, fileBuffer: Buffer }) => {
    const segments = splitFile(params.fileBuffer);
    const item: CoverUploadJob = observable({
      id: Date.now(),
      groupId: params.groupId,
      bookId: params.bookId,
      coverId: '',
      file: params.fileBuffer,
      segments,
      summaryTrxId: '',
      size: params.fileBuffer.length,
      sha256: hashBufferSha256(params.fileBuffer),
      jobs: [],
      uploading: false,
      done: false,
    });
    runInAction(() => {
      state.upload.coverJobs.push(item);
    });
    return item;
  },
  deleteCoverJob: action((jobId: number) => {
    const jobIndex = state.upload.coverJobs.findIndex((v) => v.id === jobId);
    const job = state.upload.coverJobs.at(jobIndex);
    if (job && !job.uploading) {
      state.upload.coverJobs.splice(jobIndex, 1);
    }
  }),
  startCoverJob: action((jobId: number) => {
    const job = state.upload.coverJobs.find((v) => v.id === jobId);
    if (!job || job.uploading || job.done) { return; }
    const id = v4();
    job.coverId = id;
    const now = Date.now();
    const metadataActivity: CoverSummaryActivity = {
      type: 'Create',
      published: formatISO(now),
      object: {
        type: 'CoverSummary',
        id,
        mediaType: 'application/json',
        content: JSON.stringify({
          bookId: job.bookId,
          size: job.size,
          sha256: job.sha256,
          segments: job.segments.map((v) => v.sha256),
        } satisfies CoverSummaryContent),
      },
    };
    job.jobs.push({ activity: metadataActivity, trxId: '', uploading: false, done: false });
    job.segments.forEach((v) => {
      const segmentActivity: CoverSegmentActivity = {
        type: 'Create',
        object: {
          type: 'CoverSegment',
          mediaType: 'application/octet-stream;base64',
          attributedTo: {
            type: 'CoverSummary',
            id,
          },
          content: v.buf.toString('base64'),
        },
      };
      job.jobs.push({ activity: segmentActivity, trxId: '', uploading: false, done: false });
    });

    upload._doUploadJob(job);
    when(() => !!job.summaryTrxId).then(async () => {
      try {
        const file = job.file!;
        const userAddress = nodeService.state.groupMap[job.groupId]?.user_eth_addr ?? '';
        await dbService.putCover([{
          id,
          bookId: job.bookId,
          complete: true,
          groupId: job.groupId,
          segments: job.segments.map((v) => ({ sha256: v.sha256 })),
          sha256: job.sha256,
          size: job.size,
          status: 'pending',
          timestamp: now,
          trxId: job.summaryTrxId,
          userAddress,
        }]);

        const coverBuffer: CoverBuffer = {
          groupId: job.groupId,
          bookId: id,
          file,
          coverId: '',
          timestamp: now,
        };
        await dbService.putCoverBuffer([coverBuffer]);
        const bookItem = state.groupMap.get(job.groupId)?.find((v) => v.book.id === job.bookId);
        if (bookItem) {
          runInAction(() => {
            bookItem.cover = coverBuffer;
          });
        }
      } catch (e) {
        console.error(e);
      }
    });
  }),

  bookMetadata: async (groupId: string, bookId: string, metadata: EpubMetadata) => {
    const now = Date.now();
    const activity: BookMetadataActivity = {
      type: 'Create',
      object: {
        attributedTo: {
          id: bookId,
          type: 'BookSummary',
        },
        content: JSON.stringify(metadata),
        mediaType: 'application/json',
        type: 'BookSummary',
      },
      published: formatISO(now),
    };
    const userAddress = nodeService.state.groupMap[groupId]?.user_eth_addr ?? '';
    const trxId = await upload._uploadActivity(activity, groupId);
    const metadataItem = JSON.parse(JSON.stringify({
      bookId,
      groupId,
      metadata,
      status: 'pending',
      timestamp: now,
      trxId,
      userAddress,
    }));
    await dbService.putBookMetadata([metadataItem]);
    const bookItem = state.groupMap.get(groupId)?.find((v) => v.book.id === bookId);
    if (bookItem) {
      runInAction(() => {
        bookItem.metadata = metadataItem;
      });
    }
  },

  _doUploadJob: (job: UploadJob | CoverUploadJob) => {
    runInAction(() => {
      job.uploading = true;
    });
    let count = 0;
    const check = () => {
      const item = job.jobs.find((v) => !v.uploading && !v.done);
      runInAction(() => {
        if (!item && !count) {
          job.uploading = false;
        }
        job.done = job.jobs.every((v) => v.done);
      });
      while (count < 4 && item) {
        count += 1;
        runInAction(() => {
          item.uploading = true;
        });
        upload._uploadActivity(item.activity, job.groupId)
          .then((trxId) => {
            if (job.jobs.indexOf(item) === 0) {
              runInAction(() => {
                job.summaryTrxId = trxId;
              });
            }
            return upload.checkTrx(job.groupId, trxId);
          })
          .then(action(() => {
            item.uploading = false;
            item.done = true;
          }))
          .finally(action(() => {
            item.uploading = false;
            count -= 1;
          }))
          .then(check);
      }
    };
    check();
  },
  _uploadActivity: async (activity: any, groupId: string) => {
    const res = await postContent(activity, groupId);
    return res.trx_id;
  },
  checkTrx: async (groupId: string, trxId: string) => {
    for (;;) {
      const trx = await fetchTrx(groupId, trxId);
      if (trx && Object.keys(trx).length > 0) {
        break;
      }
      await sleep(1000);
    }
  },
};

const readingProgress = {
  get: async (groupId: string, bookId: string) => {
    const item = await dbService.db.readingProgress.where({
      groupId,
      bookId,
    }).first();
    return item ?? null;
  },
  getByGroupId: async (groupId: string) => {
    const items = await dbService.db.readingProgress.where({ groupId }).toArray();
    return items;
  },
  save: async (groupId: string, bookId: string, readingProgress: string) => {
    await dbService.db.readingProgress.put({
      groupId,
      bookId,
      readingProgress,
    });
  },
};

const highlight = {
  get: async (groupId: string, bookId: string) => {
    const items = await dbService.db.highlights.where({
      groupId,
      bookId,
    }).toArray();
    return items;
  },

  save: async (groupId: string, bookId: string, cfiRange: string) => {
    await dbService.db.highlights.put({
      groupId,
      bookId,
      cfiRange,
    });
  },

  delete: async (groupId: string, bookId: string) => {
    await dbService.db.highlights.where({
      groupId,
      bookId,
    }).delete();
  },
};

const init = () => {
  const dispose = busService.on('group_leave', (v) => {
    const groupId = v.data.groupId;
    if (state.current.groupId === groupId) {
      runInAction(() => {
        state.current = {
          groupId: nodeService.state.groups.at(0)?.group_id ?? '',
          bookId: '',
        };
      });
    }
  });
  return dispose;
};

const initLoad = async () => {
  const lastRedingProgress = await dbService.db.readingProgress.toCollection().last();
  for (const group of nodeService.state.groups) {
    await loadBooks(group.group_id);
  }
  if (lastRedingProgress) {
    openBook(lastRedingProgress.groupId, lastRedingProgress.bookId);
  } else {
    openBook(nodeService.state.groups.at(0)?.group_id ?? '', '');
  }
};

const initAfterDB = () => () => {};

export const bookService = {
  state,
  init,
  initLoad,
  initAfterDB,

  upload,
  readingProgress,
  highlight,
  loadBook,
  loadBooks,
  updateCovers,
  updateBookMetadata,
  openBook,
  updateBookOpenTime,
};
