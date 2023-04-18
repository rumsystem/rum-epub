import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import RemoveMarkdown from 'remove-markdown';
import { Button, CircularProgress } from '@mui/material';

import BookImage from '~/assets/illustration_book.svg';
import ArrowImage from '~/assets/arrow.svg';
import { bookService, nodeService, ReadingProgress } from '~/service';
import { BookCoverImg, Scrollable } from '~/components';
import { lang } from '~/utils';

export const EpubGroupView = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    readingProgress: {} as Record<string, ReadingProgress>,
    loading: false,
    get groupId() {
      return bookService.state.current.groupId;
    },
    get group() {
      return nodeService.state.groupMap[this.groupId];
    },
    get books() {
      return bookService.state.groupMap.get(this.groupId) ?? [];
    },
    get uploadJob() {
      return bookService.state.upload.jobs.findLast((v) => v.groupId === this.groupId);
    },
  }));

  const handleOpenNewBook = () => {
    const bookId = state.uploadJob?.bookId;
    if (bookId) {
      bookService.openBook(state.groupId, bookId);
    }
  };

  React.useEffect(() => {
    bookService.loadBooks(state.groupId);
    bookService.readingProgress.getByGroupId(state.groupId).then(action((v) => {
      state.readingProgress = Object.fromEntries(v.map((v) => [v.bookId, v]));
    }));
  }, []);

  const isOwner = state.group?.user_pubkey === state.group?.owner_pubkey;
  const noBook = !state.uploadJob?.uploading && !state.uploadJob?.done;
  const uploading = !!state.uploadJob?.uploading;
  const uploadDone = !state.uploadJob?.uploading && !!state.uploadJob?.done;

  return (
    <div
      className={classNames(
        'flex-col',
        props.className,
      )}
    >
      {state.loading && (
        <div className="flex-col flex-1 flex-center">
          <div className="flex flex-center grow-[4]">
            <CircularProgress className="text-gray-af" />
          </div>
          <div className="grow" />
        </div>
      )}

      {!state.loading && !state.books.length && (
        <div className="flex flex-col items-center gap-y-12 p-12 select-none relative overflow-hidden flex-1 h-0">
          {(uploading || uploadDone) && (
            <img
              className="absolute top-4 left-16"
              src={ArrowImage}
              alt=""
            />
          )}

          <div
            className={classNames(
              'relative flex-col select-none p-6 gap-y-2 z-10',
              'text-gray-4a text-20 font-bold text-center',
              'outline outline-2 w-[500px] outline-dashed outline-gray-c4 outline-offset-4',
            )}
          >
            {isOwner && noBook && lang.epubGroupView.noBookUploadTip.map((v, i) => (
              <p key={i}>{v}</p>
            ))}

            {!isOwner && noBook && lang.epubGroupView.noBookWaitTip.map((v, i) => (
              <p key={i}>{v}</p>
            ))}

            {uploading && lang.epubGroupView.uploadingTip.map((v, i) => (
              <p key={i}>{v}</p>
            ))}

            {uploadDone && (<>
              <p>{lang.epubGroupView.uploadedTip}</p>
              <p>{state.uploadJob?.fileInfo.title}</p>
            </>)}
          </div>

          {uploadDone && (
            <Button
              className="rounded-full text-20 px-12"
              onClick={handleOpenNewBook}
            >
              {lang.epubGroupView.startReading}
            </Button>
          )}

          <div className="flex-col flex-center flex-1 h-0 self-stretch">
            <img className="flex-1 h-0 max-h-[350px]" src={BookImage} alt="" />
          </div>
        </div>
      )}

      {!!state.books.length && (
        <Scrollable className="flex-1">
          <div
            className="grid p-8 gap-x-10 gap-y-10 justify-center"
            style={{ gridTemplateColumns: 'repeat(auto-fill, 370px)' }}
          >
            {state.books.map(({ book, metadata }) => (
              <div className="flex" key={book.id}>
                <BookCoverImg groupId={book.groupId} bookId={book.id}>
                  {(src) => (
                    <div
                      className={classNames(
                        'w-[120px] h-[170px] border border-gray-99 flex-none overflow-hidden shadow-1',
                        'from-black/10 via-black/20 to-black/40 bg-gradient-to-b bg-cover bg-center',
                      )}
                      style={{ backgroundImage: src ? `url("${src}")` : '' }}
                    />
                  )}
                </BookCoverImg>
                <div className="flex-col ml-4 flex-1 w-0">
                  <div className="text-16 font-bold cursor-pointer truncate overflow-hidden">
                    {book.title}
                  </div>
                  <div className="text-12 text-gray-88 cursor-pointer mt-[2px]">
                    {metadata?.metadata.author}
                    {metadata?.metadata.translator && ` ${lang.epub.translatorTag}${metadata?.metadata.translator}`}
                  </div>
                  <div className="text-12 text-gray-88 cursor-pointer overflow-hidden mt-1 truncate-3">
                    {RemoveMarkdown(metadata?.metadata.description ?? '')}
                  </div>
                  <div className="grow" />
                  <div className="text-12 text-gray-33 cursor-pointer mt-2">
                    epub {Number((book.size / 1048576).toFixed(2))}MB
                  </div>
                  <div className="mt-2">
                    <Button
                      className="rounded-none px-6 opacity-90"
                      size="small"
                      onClick={() => bookService.openBook(state.groupId, book.id)}
                    >
                      {state.readingProgress[book.id] ? lang.epub.continueReading : lang.epub.startReading}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Scrollable>
      )}
    </div>
  );
});
