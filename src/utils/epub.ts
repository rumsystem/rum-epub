import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { posix } from 'path';
import { Entry, fromBuffer, ZipFile } from 'yauzl';
import * as E from 'fp-ts/lib/Either';
import { array, string, type, TypeOf } from 'io-ts';

export interface FileInfo {
  mediaType: string
  fileName: string
  title: string
  sha256: string
  segments: Array<{
    id: string
    sha256: string
  }>
}

export const epubMetadata = type({
  description: string,
  subTitle: string,
  isbn: string,
  author: string,
  translator: string,
  publishDate: string,
  publisher: string,
  languages: array(string),
  subjects: array(string),
  series: string,
  seriesNumber: string,
  categoryLevel1: string,
  categoryLevel2: string,
  categoryLevel3: string,
});

export type EpubMetadata = TypeOf<typeof epubMetadata>;

export interface FileSegment {
  id: string
  sha256: string
  buf: Buffer
}

export interface ParsedEpubBook {
  fileInfo: FileInfo
  cover: null | Buffer
  segments: Array<FileSegment>
  metadata: EpubMetadata
}

export const splitFile = (fileBuffer: Buffer) => {
  const segments: ParsedEpubBook['segments'] = [];
  for (let i = 0; ;i += 1) {
    const buf = fileBuffer.subarray(150 * 1024 * i, 150 * 1024 * (i + 1));
    if (!buf.length) {
      break;
    }
    const segsha256 = hashBufferSha256(buf);
    segments.push({
      id: `seg-${i + 1}`,
      sha256: segsha256,
      buf,
    });
  }
  return segments;
};

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
    publishDate: contentDom.querySelector('metadata > date')?.textContent ?? '',
    publisher: contentDom.querySelector('metadata > publisher')?.textContent ?? '',
    languages: [
      contentDom.querySelector('metadata > language')?.textContent ?? '',
    ] as Array<string>,
    subjects: Array.from(contentDom.querySelectorAll('metadata subject')).map((v) => v.textContent?.trim() ?? '').filter(Boolean),
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

  const sha256 = hashBufferSha256(fileBuffer);
  const segments = splitFile(fileBuffer);

  const fileInfo: FileInfo = {
    mediaType: mimetype,
    fileName,
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
