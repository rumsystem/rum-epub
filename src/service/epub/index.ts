import { action, observable, runInAction } from 'mobx';
import { postNote } from '~/apis';
import { promiseAllSettledThrottle, runLoading } from '~/utils';
import { dbService, HighlightItem } from '~/service/db';
import { parseEpub, VerifiedEpub, checkTrx, getAllEpubs, EpubBook } from './helper';
import sleep from '~/utils/sleep';

export * from './helper';

interface SegmentUploadStatus {
  name: string
  status: 'pending' | 'uploading' | 'done'
}

interface GroupUploadState {
  epub: VerifiedEpub | null
  uploading: boolean
  uploadDone: boolean
  fileinfo: any
  segments: Array<SegmentUploadStatus>
  recentUploadBook: EpubBook | null
}

const state = observable({
  uploadMap: new Map<string, GroupUploadState>(),
  bookMap: new Map<string, Array<EpubBook>>(),
  highlightMap: new Map<string, Map<string, Array<HighlightItem>>>(),
});

const getOrInit = action((groupId: string, reset = false) => {
  let item = state.uploadMap.get(groupId);
  if (reset || !item) {
    item = observable({
      epub: null,
      uploading: false,
      uploadDone: false,
      fileinfo: '',
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
      ...epub.segments.map((v) => ({
        name: v.id,
        status: 'pending',
      } as SegmentUploadStatus)),
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
      const fileinfoContent = Buffer.from(JSON.stringify({
        mediaType: epub.mediaType,
        name: epub.name,
        title: epub.title,
        sha256: epub.sha256,
        segments: epub.segments.map((v) => ({
          id: v.id,
          sha256: v.sha256,
        })),
      }));

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
      const fileInfoTrx = await postNote(data as any);
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
        const segTrx = await postNote(segData as any);
        await checkTrx(groupId, segTrx.trx_id);
        changeStatus(seg.id, 'done');
      });

      await promiseAllSettledThrottle(jobs, 20);

      for (let i = 0; i < 30; i += 1) {
        await parseAllTrx(groupId);
        const theBook = state.bookMap.get(groupId)!.find((v) => v.trxId === fileInfoTrx.trx_id);
        await sleep(1000);
        if (theBook) {
          break;
        }
      }
      runInAction(() => {
        item.uploadDone = true;
        const epub = state.bookMap.get(groupId)!.find((v) => v.trxId === fileInfoTrx.trx_id);
        item.recentUploadBook = epub ?? null;
      });
    },
  );
};

const parseAllTrx = async (groupId: string) => {
  const epubs = await getAllEpubs(groupId);
  state.bookMap.set(groupId, epubs);
};

const parseCover = (groupId: string, bookTrxId: string) => {
  const item = state.bookMap.get(groupId)?.find((v) => v.trxId === bookTrxId);
  if (!item) { return; }
  if (['loaded', 'loading', 'nocover'].includes(item.cover.type)) {
    return;
  }
  const doParse = async () => {
    try {
      const epub = await parseEpub(item.name, item.file);
      const cover = epub.cover;
      if (!cover) {
        runInAction(() => {
          item.cover = { type: 'nocover' };
        });
        return;
      }
      runInAction(() => {
        item.cover = {
          type: 'loaded',
          value: URL.createObjectURL(new Blob([cover.buffer])),
        };
      });
    } catch (e) {
      runInAction(() => {
        item.cover = { type: 'nocover' };
      });
    }
  };
  runInAction(() => {
    item.cover = {
      type: 'loading',
      value: doParse(),
    };
  });
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

export const epubService = {
  state,

  getOrInit,
  selectFile,
  doUpload,
  parseAllTrx,
  parseCover,
  getHighlights,
  saveHighlight,
  deleteHighlight,
  getReadingProgress,
  saveReadingProgress,
};
