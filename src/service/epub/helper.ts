import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { Entry, fromBuffer, ZipFile } from 'yauzl';

import { fetchContents, fetchTrx } from '~/apis';
import sleep from '~/utils/sleep';

export interface VerifiedEpub {
  mediaType: string
  name: string
  title: string
  sha256: string
  segments: Array<{
    id: string
    sha256: string
    buf: Buffer
  }>
}

export const verifyEpub = async (fileName: string, fileBuffer: Buffer): Promise<VerifiedEpub> => {
  const zipResult = await readFromZip(fileBuffer);

  const mimetypeEntry = zipResult.entries.find((v) => v.fileName === 'mimetype');
  const containerEntry = zipResult.entries.find((v) => v.fileName === 'META-INF/container.xml');
  if (!mimetypeEntry) {
    throw new Error('cant find mimetype');
  }
  if (!containerEntry) {
    throw new Error('cant find META-INF/container.xml');
  }
  const mimetype = (await readEntryFromZip(zipResult, mimetypeEntry)).toString();
  const xmlContent = (await readEntryFromZip(zipResult, containerEntry)).toString();

  const containerDom = parseXML(xmlContent);
  const fullPath = containerDom.querySelector('container > rootfiles > rootfile')?.getAttribute('full-path');
  if (!fullPath) {
    throw new Error('cant find container path');
  }
  const contentEntry = zipResult.entries.find((v) => v.fileName === fullPath);
  if (!contentEntry) {
    throw new Error('cant find content');
  }
  const container = (await readEntryFromZip(zipResult, contentEntry)).toString();

  const contentDom = parseXML(container);
  const title = contentDom.querySelector('metadata > title')?.textContent;
  if (!title) {
    throw new Error('cant find title');
  }

  const hash = createHash('sha256');
  hash.update(fileBuffer);
  const sha256 = hash.digest('hex');

  const segments = [];
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
      length: buf.length,
    });
  }

  return {
    mediaType: mimetype,
    name: fileName,
    title,
    sha256,
    segments,
  };
};

export const getAllEpubs = async (groupId: string) => {
  const arr = [] as Array<any>;
  for (;;) {
    const res = await fetchContents(
      groupId,
      {
        num: 100,
        starttrx: arr.at(-1)?.TrxId,
      },
    );

    if (!res || !res.length) {
      break;
    }

    res.forEach((v) => arr.push(v));
  }

  const epubs = arr
    .map((v, i) => ({ trx: v, i }))
    .filter((v) => v.trx.Content.type === 'File' && v.trx.Content.name === 'fileinfo')
    .map((v) => {
      const fileData = JSON.parse(Buffer.from(v.trx.Content.file.content, 'base64').toString());
      const segmentsTrx = arr.slice(v.i + 1, v.i + 1 + fileData.segments.length);
      const isSegmentsValid = segmentsTrx.every((v) => {
        const isSegment = v.Content.type === 'File'
          && /^seg-\d+$/.test(v.Content.name ?? '')
          && v.Content.file.mediaType === 'application/octet-stream';
        return isSegment;
      });
      if (!isSegmentsValid) {
        return null;
      }
      const segments = segmentsTrx.map((v) => ({
        name: v.Content.name,
        buf: Buffer.from(v.Content.file.content, 'base64'),
      }));
      const isSegmentIntegrityGood = segments.every((v) => {
        const correctHash = fileData.segments.find((u: any) => u.id === v.name)?.sha256;
        if (!correctHash) {
          return false;
        }

        const hash = createHash('sha256');
        hash.update(v.buf);
        const sha256 = hash.digest('hex');
        return sha256 === correctHash;
      });
      if (!isSegmentIntegrityGood) {
        return null;
      }

      segments.sort((a, b) => {
        const numA = Number(a.name.replace('seg-', ''));
        const numB = Number(b.name.replace('seg-', ''));
        return numA - numB;
      });
      const file = Buffer.concat(segments.map((v) => v.buf));

      const hash = createHash('sha256');
      hash.update(file);
      const sha256 = hash.digest('hex');

      if (fileData.sha256 !== sha256) {
        return null;
      }


      return {
        ...fileData,
        trxId: v.trx.TrxId as string,
        date: new Date(v.trx.TimeStamp / 1000000),
        file,
      };
    })
    .filter(Boolean);

  return epubs as Array<{
    mediaType: string
    name: string
    title: string
    sha256: string
    file: Buffer
    date: Date
    trxId: string
    segments: Array<{
      id: string
      sha256: string
    }>
  }>;
};

export type EpubBook = Awaited<ReturnType<typeof getAllEpubs>>[number];

export const checkTrx = async (groupId: string, trxId: string) => {
  for (;;) {
    try {
      const trx = await fetchTrx(groupId, trxId);
      if (!Object.keys(trx).length) {
        await sleep(2000);
        continue;
      }
      break;
    } catch (e) {
      await sleep(2000);
    }
  }
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
      res!.on('error', (e) => rj(e));
      res!.on('entry', (e) => entries.push(e));
      res!.on('end', () => rs({ zip: res!, entries }));
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
      stream!.on('data', (c) => bufArr.push(c));
      stream!.on('end', () => rs(Buffer.concat(bufArr)));
      stream!.on('error', (e) => rj(e));
    });
  },
);

const parseXML = (data: string) => {
  const parser = new DOMParser();
  const dom = parser.parseFromString(data, 'application/xml');
  return dom;
};
