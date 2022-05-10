import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { posix } from 'path';
import { Entry, fromBuffer, ZipFile } from 'yauzl';
import { parse } from 'date-fns';
import * as E from 'fp-ts/lib/Either';

import { fetchTrx } from '~/apis';
import { sleep } from '~/utils';
import { FileInfo, EpubMetadata } from '~/service/db';
import { trxAckService } from '~/service/trxAck';

export interface ParsedEpubBook {
  fileInfo: FileInfo
  cover: null | Buffer
  segments: Array<{ id: string, sha256: string, buf: Buffer }>
  metadata: EpubMetadata
}

export const parseEpub = async (fileName: string, buffer: Buffer | Uint8Array): Promise<E.Either<Error, ParsedEpubBook>> => {
  const fileBuffer = buffer instanceof Buffer
    ? buffer
    : Buffer.from(buffer);
  const zipResult = await readFromZip(fileBuffer);

  const mimetypeEntry = zipResult.entries.find((v) => v.fileName === 'mimetype');
  const containerEntry = zipResult.entries.find((v) => v.fileName === 'META-INF/container.xml');
  if (!mimetypeEntry) {
    return E.left(new Error('cant find mimetype'));
  }
  if (!containerEntry) {
    return E.left(new Error('cant find META-INF/container.xml'));
  }
  const mimetype = (await readEntryFromZip(zipResult, mimetypeEntry)).toString().replace(/^\uFEFF/, '');
  const xmlContent = (await readEntryFromZip(zipResult, containerEntry)).toString().replace(/^\uFEFF/, '');

  const containerDom = parseXML(xmlContent);
  const contentEntryPath = containerDom.querySelector('container > rootfiles > rootfile')?.getAttribute('full-path');
  if (!contentEntryPath) {
    return E.left(new Error('cant find container path'));
  }
  const contentEntry = zipResult.entries.find((v) => v.fileName === contentEntryPath);
  if (!contentEntry) {
    return E.left(new Error('cant find content'));
  }
  const container = (await readEntryFromZip(zipResult, contentEntry)).toString().replace(/^\uFEFF/, '');

  const contentDom = parseXML(container);
  const title = contentDom.querySelector('metadata > title')?.textContent;
  if (!title) {
    return E.left(new Error('cant find title'));
  }
  let publishDate = null as null | Date;
  const publishDateString = contentDom.querySelector('metadata > date')?.textContent ?? '';
  if (/^\d{4}$/.exec(publishDateString)) {
    publishDate = parse(publishDateString, 'yyyy', new Date());
  } else if (/^\d{4}-\d{2}$/.exec(publishDateString)) {
    publishDate = parse(publishDateString, 'yyyy-MM', new Date());
  } else if (/^\d{4}-\d{2}-\d{2}$/.exec(publishDateString)) {
    publishDate = parse(publishDateString, 'yyyy-MM-dd', new Date());
  } else {
    publishDate = new Date(publishDateString);
  }
  if (Number.isNaN(publishDate?.getTime() ?? NaN)) {
    publishDate = null;
  }
  const metadata: EpubMetadata = {
    description: contentDom.querySelector('metadata > description')?.textContent ?? '',
    subTitle: contentDom.querySelector('metadata > subtitle')?.textContent ?? '',
    isbn: contentDom.querySelector('metadata > #ISBN')?.textContent
      ?? contentDom.querySelector('metadata > #isbn')?.textContent
      ?? contentDom.querySelector('metadata > identifier[*|scheme="ISBN"]')?.textContent
      ?? contentDom.querySelector('metadata > identifier[*|scheme="isbn"]')?.textContent
      ?? '',
    author: contentDom.querySelector('metadata > creator')?.textContent ?? '',
    translator: contentDom.querySelector('metadata > translator')?.textContent ?? '',
    publishDate: publishDate?.getTime() ?? null,
    publisher: contentDom.querySelector('metadata > publisher')?.textContent ?? '',
    languages: [
      contentDom.querySelector('metadata > language')?.textContent ?? '',
    ] as Array<string>,
    series: '',
    seriesNumber: '',
    categoryLevel1: '',
    categoryLevel2: '',
    categoryLevel3: '',
  };
  let coverImage = null as null | Buffer;
  try {
    const coverId = contentDom.querySelector('metadata > meta[name="cover"]')?.getAttribute('content');
    if (coverId) {
      const coverHref = contentDom.querySelector(`manifest > [id="${coverId}"]`)?.getAttribute('href');
      if (coverHref) {
        const coverPath = posix.join(contentEntryPath, '..', coverHref);
        const coverEntry = zipResult.entries.find((v) => v.fileName === coverPath);
        if (coverEntry) {
          coverImage = await readEntryFromZip(zipResult, coverEntry);
        }
      }
    }
  } catch (e) {}

  const hash = createHash('sha256');
  hash.update(fileBuffer);
  const sha256 = hash.digest('hex');

  const segments: ParsedEpubBook['segments'] = [];
  for (let i = 0; ;i += 1) {
    const buf = fileBuffer.slice(150 * 1024 * i, 150 * 1024 * (i + 1));
    if (!buf.length) {
      break;
    }
    const segHash = createHash('sha256');
    segHash.update(buf);
    const segsha256 = segHash.digest('hex');
    segments.push({
      id: `seg-${i + 1}`,
      sha256: segsha256,
      buf,
    });
  }

  const fileInfo: FileInfo = {
    mediaType: mimetype,
    name: fileName,
    title,
    sha256,
    segments: segments.map((v) => ({
      id: v.id,
      sha256: v.sha256,
    })),
  };

  return E.right({
    cover: coverImage,
    metadata,
    fileInfo,
    segments,
  });
};

export interface EpubItem {
  fileInfo: FileInfo
  trxId: string
  cover: { type: 'notloaded', value: null }
  | { type: 'loading', value: Promise<unknown> }
  | { type: 'nocover', value: null }
  | { type: 'loaded', value: string }
  metadata: { type: 'notloaded', value: null }
  | { type: 'loading', value: Promise<unknown> }
  | { type: 'loaded', value: EpubMetadata }
  date: Date
  // file: Buffer
}

const checkTrx = async (groupId: string, trxId: string) => {
  for (;;) {
    try {
      const trx = await fetchTrx(groupId, trxId);
      if (!Object.keys(trx).length) {
        await sleep(2000 + Math.floor(Math.random() * 2000));
        continue;
      }
      break;
    } catch (e) {
      await sleep(2000 + Math.floor(Math.random() * 2000));
    }
  }
};

export const checkTrxAndAck = (groupId: string, trxId: string) => Promise.all([
  trxAckService.awaitAck(groupId, trxId),
  checkTrx(groupId, trxId),
]);

export interface ZipResult { zip: ZipFile, entries: Array<Entry> }

const readFromZip = async (buffer: Buffer) => new Promise<ZipResult>(
  (rs, rj) => {
    fromBuffer(buffer, (err, res) => {
      if (err) {
        rj(err);
        return;
      }
      const entries: Array<Entry> = [];
      res.on('error', (e) => rj(e));
      res.on('entry', (e) => entries.push(e));
      res.on('end', () => rs({ zip: res, entries }));
    });
  },
);

const readEntryFromZip = async (zipResult: ZipResult, entry: Entry) => new Promise<Buffer>(
  (rs, rj) => {
    zipResult.zip.openReadStream(entry, (err, stream) => {
      if (err) {
        rj(err);
      }
      const bufArr: Array<Buffer> = [];
      stream.on('data', (c) => bufArr.push(c));
      stream.on('end', () => rs(Buffer.concat(bufArr)));
      stream.on('error', (e) => rj(e));
    });
  },
);

const parseXML = (data: string) => {
  const parser = new DOMParser();
  const dom = parser.parseFromString(data, 'application/xml');
  return dom;
};

export const hashBufferSha256 = (b: Buffer) => {
  const hash = createHash('sha256');
  hash.update(b);
  const sha256 = hash.digest('hex');
  return sha256;
};
