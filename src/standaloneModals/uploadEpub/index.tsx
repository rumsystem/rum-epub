import { promises as fs } from 'fs';
import { basename } from 'path';
import React from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { action, reaction } from 'mobx';
import * as E from 'fp-ts/Either';
import { Rendition } from 'epubjs';
import { dialog, getCurrentWindow } from '@electron/remote';
import { createRoot } from 'react-dom/client';
import scrollIntoView from 'scroll-into-view-if-needed';
import { Button, CircularProgress, DialogTitle } from '@mui/material';
import FileBlankIcon from 'boxicons/svg/regular/bx-file-blank.svg?fill-icon';

import { Dialog } from '~/components';
import { ThemeRoot } from '~/utils/theme';
import { epubService, nodeService, tooltipService, dialogService } from '~/service';
import { lang } from '~/utils';

export const uploadEpub = async () => new Promise<void>((rs) => {
  const div = document.createElement('div');
  const root = createRoot(div);
  document.body.append(div);
  const unmount = () => {
    root.unmount();
    div.remove();
  };
  root.render(
    (
      <ThemeRoot>
        <UploadEpub
          rs={() => {
            rs();
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

interface Props {
  rs: () => unknown
  className?: string
  rendition?: Rendition
  renderBox?: HTMLElement | null
}

const UploadEpub = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    scrollDebounceTimer: 0,

    get groupId() {
      return epubService.state.current.groupId;
    },
    get group() {
      return nodeService.state.groupMap[this.groupId];
    },
    get groupItem() {
      return epubService.getGroupItem(this.groupId);
    },
    get uploadState() {
      return this.groupItem.upload.epub;
    },
    get uploadDone() {
      return this.uploadState.uploadDone;
    },
    get progressPercentage() {
      const items = this.uploadState?.progress ?? [];
      if (!items.length) { return 0; }
      const doneItems = items.filter((v) => v.status === 'done').length;
      const progress = doneItems / items.length;
      return `${(progress * 100).toFixed(2)}%`;
    },
    get hasWritePermission() {
      const groupId = state.groupId;
      const postAuthType = nodeService.state.trxAuthTypeMap.get(groupId)?.POST;
      const allowList = nodeService.state.allowListMap.get(groupId) ?? [];
      const denyList = nodeService.state.denyListMap.get(groupId) ?? [];
      const userPublicKey = state.group?.user_pubkey ?? '';
      if (postAuthType === 'FOLLOW_ALW_LIST' && allowList.every((v) => v.Pubkey !== userPublicKey)) {
        return false;
      }
      if (postAuthType === 'FOLLOW_DNY_LIST' && denyList.some((v) => v.Pubkey === userPublicKey)) {
        return false;
      }
      return true;
    },
  }));
  const progressBox = React.useRef<HTMLDivElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      setFile(
        file.name,
        Buffer.from(await file.arrayBuffer()),
      );
    }
  };

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
      const fileBuffer = await fs.readFile(filePath);
      setFile(fileName, fileBuffer);
    } catch (e) {
      tooltipService.show({
        content: lang.epubUpload.readFailed,
        type: 'error',
      });
    }
  };

  const handleReset = () => {
    epubService.upload.resetEpub(state.groupId);
  };

  const setFile = async (fileName: string, buffer: Buffer) => {
    const result = await epubService.upload.selectEpub(state.groupId, fileName, buffer);
    if (E.isLeft(result)) {
      tooltipService.show({
        content: lang.epubUpload.parseFailed,
        type: 'error',
      });
      return;
    }
    try {
      const book = state.uploadState?.epub;
      if (book) {
        const allBooks = state.groupItem.books;
        if (allBooks.some((v) => v.fileInfo.sha256 === book.fileInfo.sha256)) {
          const result = await dialogService.open({
            content: (
              <div>
                {lang.epubUpload.alreadyUploaded(
                  <div className="my-1">
                    {book.fileInfo.title}
                  </div>,
                )}
              </div>
            ),
          });

          if (result === 'cancel') {
            handleReset();
          }
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

  const handleClose = action(() => {
    state.open = false;
    props.rs();
  });

  const handleConfirmUpload = () => {
    epubService.upload.doUploadEpub(state.groupId);
  };

  const scrollProgressIntoView = () => {
    const item = state.uploadState.progress.find((v) => v.status === 'uploading');
    if (!item) { return; }
    const e = progressBox.current?.querySelector(`[data-upload-item-id="${item.name}"]`);
    if (e) {
      scrollIntoView(e, {
        scrollMode: 'if-needed',
        behavior: 'smooth',
      });
    }
  };

  React.useEffect(reaction(
    () => state.uploadState.progress.filter((v) => v.status === 'uploading'),
    () => {
      window.clearTimeout(state.scrollDebounceTimer);
      state.scrollDebounceTimer = window.setTimeout(scrollProgressIntoView, 300);
    },
  ), []);

  if (!state.uploadState) { return null; }
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
                  {lang.operations.back}
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
        )}
      </div>
    </Dialog>
  );
});

interface UploadEpubButtonProps {
  children: (p: {
    progressPercentage: string
    hasWritePermission: boolean
    hasUploadAtLeastOneBook: boolean
  }) => React.ReactElement | null
}

export const UploadEpubButton = observer((props: UploadEpubButtonProps) => {
  const state = useLocalObservable(() => ({
    open: true,
    scrollDebounceTimer: 0,

    get groupId() {
      return epubService.state.current.groupId;
    },
    get group() {
      return nodeService.state.groupMap[this.groupId];
    },
    get groupItem() {
      return epubService.getGroupItem(state.groupId);
    },
    get uploadState() {
      return this.groupItem.upload.epub;
    },
    get uploadDone() {
      return this.uploadState.uploadDone;
    },
    get progressPercentage() {
      const items = this.uploadState?.progress ?? [];
      if (!items.length) { return '0'; }
      const doneItems = items.filter((v) => v.status === 'done').length;
      const progress = doneItems / items.length;
      return `${(progress * 100).toFixed(2)}%`;
    },
    get hasWritePermission() {
      const groupId = state.groupId;
      const postAuthType = nodeService.state.trxAuthTypeMap.get(groupId)?.POST;
      const allowList = nodeService.state.allowListMap.get(groupId) ?? [];
      const denyList = nodeService.state.denyListMap.get(groupId) ?? [];
      const userPublicKey = state.group?.user_pubkey ?? '';
      if (postAuthType === 'FOLLOW_ALW_LIST' && allowList.every((v) => v.Pubkey !== userPublicKey)) {
        return false;
      }
      if (postAuthType === 'FOLLOW_DNY_LIST' && denyList.some((v) => v.Pubkey === userPublicKey)) {
        return false;
      }
      return true;
    },
  }));

  return props.children({
    progressPercentage: state.progressPercentage,
    hasWritePermission: state.hasWritePermission,
    hasUploadAtLeastOneBook: !!state.groupItem.books.length,
  });
});
