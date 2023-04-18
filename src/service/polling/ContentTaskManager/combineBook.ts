import { Buffer } from 'buffer';
import { either } from 'fp-ts';
import { dbService, BookSummary, BookBuffer, CoverBuffer, BookMetadata } from '~/service/db';
import { hashBufferSha256, parseEpub, sleep } from '~/utils';
import { bookService } from '~/service/book';

export const combineBook = async (groupId: string, bookIds: Array<string>) => {
  const db = dbService.db;
  await sleep(0);

  const { inCompleteBooks, segments } = await db.transaction('rw', [db.book, db.bookSegment], async () => {
    const books = await dbService.getBook(bookIds.map((v) => ({ groupId, bookId: v })));
    const inCompleteBooks = books.filter((v) => !v.complete);
    const segments = await dbService.getBookSegmentByBookId(
      inCompleteBooks.map((v) => ({ groupId: v.groupId, bookId: v.id })),
    );
    return {
      inCompleteBooks,
      segments,
    };
  });

  const booksToPut: Array<BookSummary> = [];
  const bookBufferToPut: Array<BookBuffer> = [];
  const coverBufferToPut: Array<CoverBuffer> = [];
  const metadataToPut: Array<BookMetadata> = [];
  for (const book of inCompleteBooks) {
    const foundSegments = book.segments.map(
      (v) => segments.find(
        (u) => u.bookId === book.id && u.sha256 === v.sha256,
      ),
    );
    if (foundSegments.every((v) => v)) {
      const bookBuffer = Buffer.concat(foundSegments.map((v) => v!.buffer));
      const bookSha256 = hashBufferSha256(bookBuffer);
      if (book.sha256 !== bookSha256) {
        continue;
      }
      try {
        const metadata = await parseEpub('book', bookBuffer);
        if (either.isLeft(metadata)) { continue; }
        if (metadata.right.cover) {
          coverBufferToPut.push({
            groupId,
            bookId: book.id,
            file: metadata.right.cover,
            coverId: '',
            timestamp: book.timestamp,
          });
        }

        metadataToPut.push({
          userAddress: book.userAddress,
          bookId: book.id,
          groupId: book.groupId,
          trxId: '',
          metadata: metadata.right.metadata,
          timestamp: book.timestamp,
          status: 'synced',
        });

        book.complete = true;
        booksToPut.push(book);
        bookBufferToPut.push({
          groupId: book.groupId,
          bookId: book.id,
          file: bookBuffer,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  await db.transaction('rw', [
    db.book,
    db.bookBuffer,
    db.coverBuffer,
    db.bookMetadata,
  ], async () => {
    await Promise.all([
      dbService.putBook(booksToPut),
      dbService.putBookBuffer(bookBufferToPut),
      dbService.putCoverBuffer(coverBufferToPut),
      dbService.putBookMetadata(metadataToPut),
    ]);
  });

  if (booksToPut.length) {
    bookService.loadBooks(groupId);
  }
};
