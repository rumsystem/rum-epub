import { basename } from 'path';
import { readFile } from 'fs/promises';
import classNames from 'classnames';
import { either } from 'fp-ts';
import { dialog, getCurrentWindow } from '@electron/remote';
import { Button, CircularProgress, Dialog, DialogTitle } from '@mui/material';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { bookService, dialogService, nodeService, tooltipService } from '~/service';
import { lang } from '~/utils';
import { action, runInAction } from 'mobx';
import { useEffect } from 'react';

export interface Props {
  groupId: string
}

export const UploadBook = observer((props: { destroy: () => unknown } & Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    file: null,
    get group() {
      return nodeService.state.groupMap[props.groupId];
    },
    jobId: 0,
    get job() {
      return bookService.state.upload.jobs.find((v) => v.id === this.jobId);
    },
    get progressPercentage() {
      if (!this.job) { return '0'; }
      const a = this.job.jobs.filter((v) => v.done).length / this.job.jobs.length;
      return `${(a * 100).toFixed(2)}%`;
    },
  }));

  const handleClose = action(() => {
    state.open = false;
    setTimeout(action(() => {
      props.destroy();
    }), 2000);
  });

  const handleSelectFile = async () => {
    const res = await dialog.showOpenDialog(getCurrentWindow(), {
      filters: [{
        name: '*',
        extensions: ['epub'],
      }],
    });
    if (res.canceled) { return; }
    try {
      const filePath = res.filePaths[0];
      const fileName = basename(filePath);
      const fileBuffer = await readFile(filePath);
      setFile(fileName, fileBuffer);
    } catch (e) {
      tooltipService.show({
        content: lang.epubUpload.readFailed,
        type: 'error',
      });
    }
  };

  const setFile = async (fileName: string, fileBuffer: Buffer) => {
    const result = await bookService.upload.createJob({
      groupId: props.groupId,
      fileName,
      fileBuffer,
    });
    if (either.isLeft(result)) {
      tooltipService.show({
        content: lang.epubUpload.parseFailed,
        type: 'error',
      });
      return;
    }
    runInAction(() => {
      state.jobId = result.right.id;
    });
    try {
      await bookService.loadBooks(props.groupId);
      const books = bookService.state.groupMap.get(props.groupId);
      if (books?.some((v) => v.book.sha256 === state.job?.sha256)) {
        const result = await dialogService.open({
          content: (
            <div>
              {lang.epubUpload.alreadyUploaded(
                <div className="my-1">
                  {state.job?.fileInfo.title}
                </div>,
              )}
            </div>
          ),
        });
        if (result === 'cancel') {
          runInAction(() => {
            bookService.upload.deleteJob(state.jobId);
            state.jobId = 0;
          });
        }
      }
    } catch (e) {
      console.error(e);
      tooltipService.show({
        content: lang.epubUpload.readFailed,
        type: 'error',
      });
    }
  };

  const handleCancelJob = action(() => {
    // bookService.upload.deleteJob(state.jobId);
    // state.jobId = 0;
  });

  const handleBack = action(() => {
    state.jobId = 0;
  });

  const handleStartUpload = () => {
    bookService.upload.startJob(state.jobId);
  };

  useEffect(() => {
    const job = bookService.state.upload.jobs.find((v) => v.groupId === props.groupId && !v.done);
    if (job) {
      runInAction(() => {
        state.jobId = job.id;
      });
    }
  }, []);

  return (
    <Dialog
      open={state.open}
      onClose={handleClose}
      keepMounted
      maxWidth={false}
    >
      <div className="p-8">
        <DialogTitle className="text-center font-medium text-24">
          {lang.epubUpload.uploadEpub}
        </DialogTitle>
        <div className="text-center mb-4">
          {lang.epubUpload.uploadToSeedNet(state.group?.group_name ?? '')}
        </div>

        {!state.job && (
          <div className="px-8">
            <div
              className={classNames(
                'flex flex-center select-none mt-2 rounded-lg h-[200px] w-[500px]',
                'outline outline-2 outline-dashed outline-gray-c4',
              )}
              // onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <span className="text-18 text-gray-9b">
                {lang.epubUpload.dragEpubHere}
              </span>
            </div>

            <div className="flex items-center gap-x-12 mt-8">
              <div className="h-px bg-gray-c4 flex-1" />
              <div className="text-18 text-gray-9b">{lang.epubUpload.or}</div>
              <div className="h-px bg-gray-c4 flex-1" />
            </div>

            <div className="flex flex-center mt-8 mb-2">
              <Button
                className="text-20 px-12 rounded-full"
                onClick={handleSelectFile}
              >
                {lang.epubUpload.selectEpubFile}
              </Button>
            </div>
          </div>
        )}

        {!!state.job && (
          <div className="px-8">
            <div
              className={classNames(
                'relative flex-col select-none p-4 mt-2',
                'outline outline-2 w-[500px] outline-dashed outline-gray-c4 outline-offset-4',
              )}
              // onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="text-18 relative z-10 truncate text-gray-9b">
                {lang.epubUpload.selected}
              </div>
              <div className="text-18 relative z-10 truncate text-gray-4a font-bold">
                {state.job.fileInfo.title}
              </div>
              <div
                className={classNames(
                  'absolute left-0 top-0 h-full bg-gray-ec duration-300',
                )}
                style={{ width: state.job.done ? '100%' : state.progressPercentage }}
              />
            </div>

            {state.job.uploading && (
              <div className="flex flex-center mt-12">
                <CircularProgress className="text-black/40" size={64} />
                {/* {state.uploadState.epub.fileInfo.title} */}
              </div>
            )}

            {state.job.done && (
              <div className="flex flex-center mt-12">
                {lang.epubUpload.uploadSuccess}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 max-h-[210px] mt-4 mx-4 overflow-y-auto py-1">
              {/* {state.uploadState.progress.map((v) => (
                <div
                  className={classNames(
                    'flex items-center gap-x-1',
                    v.status === 'uploading' && 'bg-gray-f2',
                  )}
                  key={v.name}
                  data-upload-item-id={v.name}
                >
                  <div className="flex flex-center w-6 h-6 pt-px">
                    {v.status === 'pending' && (
                      <FileBlankIcon className="text-gray-af text-22" />
                    )}
                    {v.status === 'uploading' && (
                      <CircularProgress size={14} className="text-blue-400" />
                    )}
                    {v.status === 'done' && (
                      <FileBlankIcon className="text-blue-400 text-22" />
                    )}
                  </div>
                  <div className="text-14 text-gray-70">
                    {v.name}
                  </div>
                </div>
              ))} */}
            </div>

            {/* {!state.uploadState.uploading && state.uploadState.uploadDone && (
              <div className="flex flex-center mt-8 text-gray-4a text-16">
                {lang.epubUpload.uploadSuccess}
              </div>
            )} */}

            <div className="flex flex-center gap-x-16 mt-12 mb-2">
              {!state.job.uploading && !state.job.done && (<>
                <Button
                  className="text-16 px-12 rounded-full"
                  color="inherit"
                  onClick={handleCancelJob}
                >
                  {lang.operations.back}
                </Button>
                <Button
                  className="text-16 px-12 rounded-full"
                  onClick={handleStartUpload}
                >
                  {lang.epubUpload.confirmUpload}
                </Button>
              </>)}
              {state.job.uploading && (
                <Button
                  className="text-16 px-12 rounded-full"
                  color="inherit"
                  onClick={handleClose}
                >
                  {lang.operations.closeWindow}
                </Button>
              )}
              {!state.job.uploading && state.job.done && (<>
                <Button
                  className="text-16 px-12 rounded-full"
                  color="inherit"
                  onClick={handleBack}
                >
                  {lang.epubUpload.uploadMore}
                </Button>
                <Button
                  className="text-16 px-12 rounded-full"
                  color="primary"
                  onClick={handleClose}
                >
                  {lang.operations.closeWindow}
                </Button>
              </>)}
            </div>
          </div>
        )}

        {/* <div className="text-center mb-4">
          {lang.epubUpload.uploadToSeedNet(state.group?.group_name ?? '')}
        </div>

        {!state.uploadState.epub && (
          <div className="px-8">
            <div
              className={classNames(
                'flex flex-center select-none mt-2 rounded-lg h-[200px] w-[500px]',
                'outline outline-2 outline-dashed outline-gray-c4',
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <span className="text-18 text-gray-9b">
                {lang.epubUpload.dragEpubHere}
              </span>
            </div>

            <div className="flex items-center gap-x-12 mt-8">
              <div className="h-px bg-gray-c4 flex-1" />
              <div className="text-18 text-gray-9b">{lang.epubUpload.or}</div>
              <div className="h-px bg-gray-c4 flex-1" />
            </div>

            <div className="flex flex-center mt-8 mb-2">
              <Button
                className="text-20 px-12 rounded-full"
                onClick={handleSelectFile}
              >
                {lang.epubUpload.selectEpubFile}
              </Button>
            </div>
          </div>
        )}

        {!!state.uploadState.epub && (
          <div className="px-8">
            <div
              className={classNames(
                'relative flex-col select-none p-4 mt-2',
                'outline outline-2 w-[500px] outline-dashed outline-gray-c4 outline-offset-4',
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="text-18 text-gray-9b relative z-10">
                {lang.epubUpload.selected}
              </div>
              <div className="text-18 text-gray-4a font-bold relative z-10">
                {state.uploadState.epub.fileInfo.name}
              </div>
              <div
                className={classNames(
                  'absolute left-0 top-0 h-full bg-gray-ec duration-300',
                )}
                style={{ width: state.uploadState.uploadDone ? '100%' : state.progressPercentage }}
              />
            </div>

            <div className="text-16 text-gray-70 mt-8 mx-4">
              {state.uploadState.epub.fileInfo.title}
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-[210px] mt-4 mx-4 overflow-y-auto py-1" ref={progressBox}>
              {state.uploadState.progress.map((v) => (
                <div
                  className={classNames(
                    'flex items-center gap-x-1',
                    v.status === 'uploading' && 'bg-gray-f2',
                  )}
                  key={v.name}
                  data-upload-item-id={v.name}
                >
                  <div className="flex flex-center w-6 h-6 pt-px">
                    {v.status === 'pending' && (
                      <FileBlankIcon className="text-gray-af text-22" />
                    )}
                    {v.status === 'uploading' && (
                      <CircularProgress size={14} className="text-blue-400" />
                    )}
                    {v.status === 'done' && (
                      <FileBlankIcon className="text-blue-400 text-22" />
                    )}
                  </div>
                  <div className="text-14 text-gray-70">
                    {v.name}
                  </div>
                </div>
              ))}
            </div>

            {!state.uploadState.uploading && state.uploadState.uploadDone && (
              <div className="flex flex-center mt-8 text-gray-4a text-16">
                {lang.epubUpload.uploadSuccess}
              </div>
            )}

            <div className="flex flex-center gap-x-16 mt-12 mb-2">
              {!state.uploadState.uploading && !state.uploadState.uploadDone && (<>
                <Button
                  className="text-16 px-12 rounded-full"
                  color="inherit"
                  onClick={handleReset}
                >
                  {lang.operations.back}
                </Button>
                <Button
                  className="text-16 px-12 rounded-full"
                  onClick={handleConfirmUpload}
                >
                  {lang.epubUpload.confirmUpload}
                </Button>
              </>)}
              {state.uploadState.uploading && (
                <Button
                  className="text-16 px-12 rounded-full"
                  color="inherit"
                  onClick={handleClose}
                >
                  {lang.operations.closeWindow}
                </Button>
              )}
              {!state.uploadState.uploading && state.uploadState.uploadDone && (<>
                <Button
                  className="text-16 px-12 rounded-full"
                  color="inherit"
                  onClick={handleReset}
                >
                  {lang.epubUpload.uploadMore}
                </Button>
                <Button
                  className="text-16 px-12 rounded-full"
                  color="primary"
                  onClick={() => { handleClose(); window.setTimeout(handleReset, 300); }}
                >
                  {lang.operations.closeWindow}
                </Button>
              </>)}
            </div>
          </div>
        )} */}
      </div>
    </Dialog>
  );
});
