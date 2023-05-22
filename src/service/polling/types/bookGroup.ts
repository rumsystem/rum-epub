import { either, function as fp, json } from 'fp-ts';
import { TypeOf, array, intersection, literal, number, partial, string, type } from 'io-ts';
import { IContentItem } from '~/apis';
import { epubMetadata } from '~/utils';

export const bookSummaryActivity = intersection([
  type({
    type: literal('Create'),
    object: type({
      type: literal('BookSummary'),
      id: string,
      name: string,
      content: string,
      mediaType: literal('application/json'),
    }),
  }),
  partial({
    published: string,
  }),
]);

export const bookSummaryContent = type({
  /** Array<Hash> */
  sha256: string,
  size: number,
  segments: array(string),
});

export const bookSegmentActivity = type({
  type: literal('Create'),
  object: type({
    type: literal('BookSegment'),
    content: string,
    mediaType: literal('application/octet-stream;base64'),
    attributedTo: type({
      id: string,
      type: literal('BookSummary'),
    }),
  }),
});

export const bookMetadataActivity = intersection([
  type({
    type: literal('Create'),
    object: type({
      type: literal('BookSummary'),
      content: string,
      mediaType: literal('application/json'),
      attributedTo: type({
        id: string,
        type: literal('BookSummary'),
      }),
    }),
  }),
  partial({
    published: string,
  }),
]);

export const coverSummaryActivity = intersection([
  type({
    type: literal('Create'),
    object: type({
      type: literal('CoverSummary'),
      id: string,
      content: string,
      mediaType: literal('application/json'),
    }),
  }),
  partial({
    published: string,
  }),
]);

export const coverSummaryContent = type({
  /** Array<Hash> */
  sha256: string,
  bookId: string,
  size: number,
  segments: array(string),
});

export const coverSegmentActivity = type({
  type: literal('Create'),
  object: type({
    type: literal('CoverSegment'),
    content: string,
    mediaType: literal('application/octet-stream;base64'),
    attributedTo: type({
      id: string,
      type: literal('CoverSummary'),
    }),
  }),
});


export type BookSummaryActivity = TypeOf<typeof bookSummaryActivity>;
export type BookSummaryContent = TypeOf<typeof bookSummaryContent>;
export type BookSegmentActivity = TypeOf<typeof bookSegmentActivity>;
export type BookMetadataActivity = TypeOf<typeof bookMetadataActivity>;
export type CoverSummaryActivity = TypeOf<typeof coverSummaryActivity>;
export type CoverSummaryContent = TypeOf<typeof coverSummaryContent>;
export type CoverSegmentActivity = TypeOf<typeof coverSegmentActivity>;

export const bookGroupActivityChecker = {
  isBookSummary: (v: IContentItem) => fp.pipe(
    bookSummaryActivity.decode(v.Data),
    either.chainW((u) => json.parse(u.object.content)),
    either.chainW((u) => bookSummaryContent.decode(u)),
    either.fold(() => false, () => true),
  ),
  isBookSegment: (v: IContentItem) => fp.pipe(
    bookSegmentActivity.decode(v.Data),
    either.fold(() => false, () => true),
  ),
  isBookMetadata: (v: IContentItem) => fp.pipe(
    bookMetadataActivity.decode(v.Data),
    either.chainW((u) => json.parse(u.object.content)),
    either.chainW((u) => epubMetadata.decode(u)),
    either.fold(() => false, () => true),
  ),
  isEmptyObject: (item: IContentItem) => !item
    || !item.Data
    || (typeof item.Data === 'object' && Object.keys(item.Data).length === 0),
  isCoverSummary: (v: IContentItem) => fp.pipe(
    coverSummaryActivity.decode(v.Data),
    either.chainW((u) => json.parse(u.object.content)),
    either.chainW((u) => coverSummaryContent.decode(u)),
    either.fold(() => false, () => true),
  ),
  isCoverSegment: (v: IContentItem) => fp.pipe(
    coverSegmentActivity.decode(v.Data),
    either.fold(() => false, () => true),
  ),
};
