import { Buffer } from 'buffer';
import { dbService, CoverSummary, CoverBuffer } from '~/service/db';
import { hashBufferSha256, sleep } from '~/utils';
import { bookService } from '~/service/book';

export const combineCover = async (groupId: string, coverIds: Array<string>) => {
  const db = dbService.db;
  await sleep(0);

  const { inCompleteCovers, segments } = await db.transaction('rw', [db.cover, db.coverSegment], async () => {
    const covers = await dbService.getCover(coverIds.map((v) => ({ groupId, coverId: v })));
    const inCompleteCovers = covers.filter((v) => !v.complete);
    const segments = await dbService.getCoverSegmentByCoverId(
      inCompleteCovers.map((v) => ({ groupId: v.groupId, coverId: v.id })),
    );
    return {
      inCompleteCovers,
      segments,
    };
  });

  const coversToPut: Array<CoverSummary> = [];
  const coverBufferToPut: Array<CoverBuffer> = [];
  for (const cover of inCompleteCovers) {
    const foundSegments = cover.segments.map(
      (v) => segments.find(
        (u) => u.coverId === cover.id && u.sha256 === v.sha256,
      ),
    );
    if (foundSegments.every((v) => v)) {
      const coverBuffer = Buffer.concat(foundSegments.map((v) => v!.buffer));
      const coverSha256 = hashBufferSha256(coverBuffer);
      if (cover.sha256 !== coverSha256) { continue; }
      try {
        cover.complete = true;
        coversToPut.push(cover);
        coverBufferToPut.push({
          groupId: cover.groupId,
          coverId: cover.id,
          file: coverBuffer,
          bookId: cover.bookId,
          timestamp: cover.timestamp,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  await db.transaction('rw', [
    db.cover,
    db.coverBuffer,
  ], async () => {
    await Promise.all([
      dbService.putCover(coversToPut),
      dbService.putCoverBuffer(coverBufferToPut),
    ]);
  });

  if (coverBufferToPut.length) {
    bookService.updateCovers(coverBufferToPut);
  }
};
