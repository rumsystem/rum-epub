import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, CircularProgress } from '@mui/material';

import BookImage from '~/assets/illustration_book.svg';
import ArrowImage from '~/assets/arrow.svg';
import { epubService, GroupBookItem, nodeService, ReadingProgressItem } from '~/service';
import { BookCoverImg, Scrollable } from '~/components';
import { lang } from '~/utils';


export const EpubGroupView = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    books: [] as Array<GroupBookItem>,
    readingProgress: {} as Record<string, ReadingProgressItem>,
    loading: true,
    get groupId() {
      return epubService.state.current.groupId;
    },
    get group() {
      return nodeService.state.groupMap[this.groupId];
    },
    get groupItem() {
      return epubService.getGroupItem(state.groupId);
    },
    get currentUploadItem() {
      return this.groupItem.upload.epub;
    },
  }));

  const handleOpenRecentlyUploadedBook = () => {
    const book = state.currentUploadItem?.recentUploadBook;
    epubService.upload.resetEpub(state.groupId);
    if (book) {
      epubService.openBook(epubService.state.current.groupId, book.trxId);
    }
  };

  React.useEffect(() => {
    epubService.readingProgress.getAll(state.groupId).then((v) => {
      state.readingProgress = Object.fromEntries(v.map((v) => [v.bookTrx, v]));
    });
    new Promise<void>((rs) => epubService.loadAndParseBooks(state.groupId, rs))
      .then(action(() => {
        const books = epubService.getGroupItem(state.groupId).books;
        state.books = books;
      }))
      .finally(action(() => {
        state.loading = false;
      }));
  }, []);

  const isOwner = state.group?.user_pubkey === state.group?.owner_pubkey;
  const noBook = !state.currentUploadItem?.uploading && !state.currentUploadItem?.recentUploadBook;
  const uploading = !!state.currentUploadItem?.uploading;
  const uploadDone = !state.currentUploadItem?.uploading && !!state.currentUploadItem?.recentUploadBook;

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
              <p>{state.currentUploadItem?.recentUploadBook?.fileInfo.title}</p>
            </>)}
          </div>

          {uploadDone && (
            <Button
              className="rounded-full text-20 px-12"
              onClick={handleOpenRecentlyUploadedBook}
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
            {state.books.map((v) => (
              <div className="flex" key={v.trxId}>
                <BookCoverImg bookTrx={v.trxId} groupId={state.groupId}>
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
                    {v.fileInfo.title}
                  </div>
                  <div className="text-12 text-gray-88 cursor-pointer mt-[2px]">
                    {v.metadata?.author}
                    {v.metadata?.translator && ` ${lang.epub.translatorTag}${v.metadata?.translator}`}
                  </div>
                  <div
                    className="text-12 text-gray-88 cursor-pointer overflow-hidden mt-1"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: '3',
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {v.metadata?.description}
                  </div>
                  <div className="grow" />
                  <div className="text-12 text-gray-33 cursor-pointer mt-2">
                    epub {Number((v.size / 1048576).toFixed(2))}MB
                  </div>
                  <div className="mt-2">
                    <Button
                      className="rounded-none px-6 opacity-90"
                      size="small"
                      onClick={() => epubService.openBook(state.groupId, v.trxId)}
                    >
                      {state.readingProgress[v.trxId] ? lang.epub.continueReading : lang.epub.startReading}
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
