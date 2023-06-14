import { either, function as fp } from 'fp-ts';
import { Errors, Type, TypeOf, array, intersection, literal, partial, string, type, union } from 'io-ts';
import { IContentItem } from '~/apis';

const imageContentType = type({
  type: literal('Image'),
  mediaType: string,
  content: string,
});

const imageLinkType = intersection([
  type({
    type: literal('Image'),
    url: string,
  }),
  partial({
    mediaType: string,
  }),
]);

const imageType = union([imageContentType, imageLinkType]);

const partialImages = partial({
  image: union([
    array(imageType),
    imageType,
  ]),
});

const partialImageContents = partial({
  image: union([
    array(imageContentType),
    imageContentType,
  ]),
});

export const postBaseType = intersection([
  type({
    type: literal('Create'),
    object: intersection([
      partialImages,
      type({
        type: literal('Note'),
        id: string,
        content: string,
      }),
      partial({
        quote: union([
          string,
          intersection([
            type({
              type: literal('Quote'),
            }),
            partial({
              content: string,
              url: string,
              name: string,
              book: string,
              bookId: string,
              author: string,
              chapter: string,
              chapterId: string,
              range: string,
            }),
          ]),
        ]),
      }),
      // old version trx
      partial({
        bookId: string,
        chapter: string,
        chapterId: string,
        quoteRange: string,
      }),
      partial({
        name: string,
      }),
    ]),
  }),
  partial({
    published: string,
  }),
]);

export const postExcludedType = type({
  type: literal('Create'),
  object: type({
    type: literal('Note'),
    inreplyto: type({
      type: literal('Note'),
      id: string,
    }),
  }),
});

export const postDeleteType = intersection([
  type({
    type: literal('Delete'),
    object: type({
      type: literal('Note'),
      id: string,
    }),
  }),
  partial({
    published: string,
  }),
]);

export const postType = new Type<PostType>(
  'post type',
  (u): u is PostType => postBaseType.is(u) && !postExcludedType.is(u),
  (u, c) => fp.pipe(
    postBaseType.validate(u, c),
    either.chain(() => fp.pipe(
      postExcludedType.validate(u, c),
      either.match(
        () => either.right(u),
        () => either.left([{
          value: u,
          context: c,
          message: 'item has unwanted properties',
        }] as Errors),
      ),
    )),
    either.map((v) => v as PostType),
  ),
  fp.identity,
);

export const commentType = intersection([
  type({
    type: literal('Create'),
    object: intersection([
      partialImages,
      type({
        type: literal('Note'),
        id: string,
        content: string,
        inreplyto: type({
          type: literal('Note'),
          id: string,
        }),
      }),
    ]),
  }),
  partial({
    published: string,
  }),
]);

export const nonUndoCounterType = intersection([
  type({
    type: union([literal('Like'), literal('Dislike')]),
    object: type({
      type: literal('Note'),
      id: string,
    }),
  }),
  partial({
    published: string,
  }),
]);
export const undoCounterType = intersection([
  type({
    type: literal('Undo'),
    object: nonUndoCounterType,
  }),
  partial({
    published: string,
  }),
]);
export const counterType = union([nonUndoCounterType, undoCounterType]);

export const profileType = intersection([
  type({
    type: literal('Create'),
    object: intersection([
      type({
        type: literal('Profile'),
        name: string,
        describes: type({
          type: literal('Person'),
          id: string,
        }),
      }),
      partialImageContents,
      // partial({
      //   wallet: array(type({
      //     id: string,
      //     type: string,
      //     name: string,
      //   })),
      // }),
    ]),
  }),
  partial({
    published: string,
  }),
]);

export type PostType = TypeOf<typeof postBaseType>;
export type PostDeleteType = TypeOf<typeof postDeleteType>;
export type CommentType = TypeOf<typeof commentType>;
export type NonUndoCounterType = TypeOf<typeof nonUndoCounterType>;
export type UndoCounterType = TypeOf<typeof undoCounterType>;
export type CounterType = TypeOf<typeof counterType>;
export type ProfileType = TypeOf<typeof profileType>;

export const linkGroupActivityChecker = {
  isPost: (v: IContentItem) => fp.pipe(
    postType.decode(v.Data),
    either.fold(() => false, () => true),
  ),
  isPostDelete: (v: IContentItem) => fp.pipe(
    postDeleteType.decode(v.Data),
    either.fold(() => false, () => true),
  ),
  isComment: (v: IContentItem) => fp.pipe(
    commentType.decode(v.Data),
    either.fold(() => false, () => true),
  ),
  isCounter: (v: IContentItem) => fp.pipe(
    counterType.decode(v.Data),
    either.fold(() => false, () => true),
  ),
  isProfile: (v: IContentItem) => fp.pipe(
    profileType.decode(v.Data),
    either.fold(() => false, () => true),
  ),
};
