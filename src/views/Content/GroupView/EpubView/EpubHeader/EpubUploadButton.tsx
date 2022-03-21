import { promises as fs } from 'fs';
import { basename } from 'path';
import React from 'react';
import classNames from 'classnames';
import { action, reaction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { dialog, getCurrentWindow } from '@electron/remote';
import { Rendition } from 'epubjs';
import { Button, CircularProgress, DialogTitle } from '@mui/material';
import scrollIntoView from 'scroll-into-view-if-needed';
import UploadIcon from 'boxicons/svg/regular/bx-upload.svg?fill';
import FileBlankIcon from 'boxicons/svg/regular/bx-file-blank.svg?fill';

import Dialog from '~/components/Dialog';

import { epubService } from '~/service/epub';
import { nodeService } from '~/service/node';
import { tooltipService } from '~/service/tooltip';

interface Props {
  className?: string
  rendition?: Rendition
  renderBox?: HTMLElement | null
}

export const EpubUploadButton = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,

    // epub: null as null | VerifiedEpub,
    // uploadProgress: [] as Array<[string, UploadStatus]>,
    // uploading: false,

    scrollDebounceTimer: 0,

    get uploadDone() {
      return !!epubService.state.uploadMap.get(nodeService.state.activeGroupId)?.uploadDone;
    },

    get item() {
      return epubService.state.uploadMap.get(nodeService.state.activeGroupId) ?? null;
    },

    get progressPercentage() {
      const items = this.item?.segments ?? [];
      if (!items.length) { return 0; }
      const doneItems = items.filter((v) => v.status === 'done').length;
      const progress = doneItems / items.length;
      return `${(progress * 100).toFixed(2)}%`;
    },
  }));
  // const { snackbarStore } = useStore();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
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
        content: '读取文件错误',
        type: 'error',
      });
    }
  };

  const handleCancelFileSelect = () => {
    epubService.getOrInit(nodeService.state.activeGroupId, true);
  };

  const setFile = async (fileName: string, buffer: Buffer) => {
    try {
      await epubService.selectFile(nodeService.state.activeGroupId, fileName, buffer);
    } catch (e) {
      tooltipService.show({
        content: '文件读取错误',
        type: 'error',
      });
    }
  };

  const handleOpen = action(() => {
    state.open = true;
  });

  const handleClose = action(() => {
    state.open = false;
  });

  const handleReset = action(() => {
    epubService.getOrInit(nodeService.state.activeGroupId, true);
  });

  const handleConfirmUpload = () => {
    epubService.doUpload(nodeService.state.activeGroupId);
  };

  const scrollProgressIntoView = () => {
    const item = state.item?.segments?.find((v) => v.status === 'uploading');
    if (!item) {
      return;
    }
    const e = progressBox.current?.querySelector(`[data-upload-item-id="${item.name}"]`);
    if (e) {
      scrollIntoView(e, {
        scrollMode: 'if-needed',
        behavior: 'smooth',
      });
    }
  };

  React.useEffect(() => {
    epubService.getOrInit(nodeService.state.activeGroupId);
  }, []);

  React.useEffect(reaction(
    () => state.item?.segments.filter((v) => v.status === 'uploading'),
    () => {
      window.clearTimeout(state.scrollDebounceTimer);
      state.scrollDebounceTimer = window.setTimeout(scrollProgressIntoView, 300);
    },
  ), []);

  if (!state.item) {
    return null;
  }

  return (<>
    <Button
      className={classNames('relative overflow-hidden', props.className)}
      onClick={handleOpen}
      ref={buttonRef}
    >
      <div className="flex flex-center gap-x-2 relative z-10">
        <UploadIcon />
        <span>
          上传书籍
        </span>
      </div>

      <div
        className={classNames(
          'absolute left-0 top-0 h-full bg-white/30 duration-300',
          (state.item.uploadDone || !state.item.uploading) && 'hidden',
        )}
        style={{ width: state.progressPercentage }}
      />
    </Button>

    <Dialog
      open={state.open}
      onClose={handleClose}
      keepMounted
      maxWidth={false}
    >
      <div className="p-8">
        <DialogTitle className="text-center font-medium text-24">
          上传Epub文件
        </DialogTitle>

        {!state.item.epub && (
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
                将Epub文件拖拽到此处
              </span>
            </div>

            <div className="flex items-center gap-x-12 mt-8">
              <div className="h-px bg-gray-c4 flex-1" />
              <div className="text-18 text-gray-9b">或者</div>
              <div className="h-px bg-gray-c4 flex-1" />
            </div>

            <div className="flex flex-center mt-8 mb-2">
              <Button
                className="text-20 px-12 rounded-full"
                onClick={handleSelectFile}
              >
                选择本地Epub文件
              </Button>
            </div>
          </div>
        )}

        {!!state.item.epub && (
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
                已选择：
              </div>
              <div className="text-18 text-gray-4a font-bold relative z-10">
                {state.item.epub.name}
              </div>
              <div
                className={classNames(
                  'absolute left-0 top-0 h-full bg-gray-ec duration-300',
                )}
                style={{ width: state.item.uploadDone ? '100%' : state.progressPercentage }}
              />
            </div>

            <div className="text-16 text-gray-70 mt-8 mx-4">
              {state.item.epub.title}
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-[250px] mt-4 mx-4 overflow-y-auto py-1" ref={progressBox}>
              {state.item.segments.map((v) => (
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
                      <FileBlankIcon width="18" className="text-gray-af" />
                    )}
                    {v.status === 'uploading' && (
                      <CircularProgress size={14} className="text-blue-400" />
                    )}
                    {v.status === 'done' && (
                      <FileBlankIcon className="text-blue-400 text-18" />
                    )}
                  </div>
                  <div className="text-14 text-gray-70">
                    {v.name}
                  </div>
                </div>
              ))}
            </div>

            {!state.item.uploading && state.item.uploadDone && (
              <div className="flex flex-center mt-8 text-gray-4a text-16">
                上传成功！
              </div>
            )}

            <div className="flex flex-center gap-x-16 mt-8 mb-2">
              {!state.item.uploading && !state.item.uploadDone && (<>
                <Button
                  className="text-20 px-12 rounded-full"
                  color="inherit"
                  onClick={handleCancelFileSelect}
                >
                  返回
                </Button>
                <Button
                  className="text-20 px-12 rounded-full"
                  onClick={handleConfirmUpload}
                >
                  确认上传
                </Button>
              </>)}
              {state.item.uploading && (
                <Button
                  className="text-20 px-12 rounded-full"
                  color="inherit"
                  onClick={handleClose}
                >
                  关闭窗口
                </Button>
              )}
              {!state.item.uploading && state.item.uploadDone && (<>
                <Button
                  className="text-20 px-12 rounded-full"
                  color="inherit"
                  onClick={handleReset}
                >
                  返回
                </Button>

                <Button
                  className="text-20 px-12 rounded-full"
                  color="primary"
                  onClick={() => { handleClose(); window.setTimeout(handleReset, 300); }}
                >
                  关闭窗口
                </Button>
              </>)}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  </>);
});
