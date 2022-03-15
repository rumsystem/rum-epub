import React from 'react';
import { action, observable, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { dialog, getCurrentWindow } from '@electron/remote';
import { Rendition } from 'epubjs';
import { CircularProgress, Tooltip } from '@material-ui/core';
import scrollIntoView from 'scroll-into-view-if-needed';

import contentApi from 'apis/content';
import Button from 'components/Button';
import Dialog from 'components/Dialog';
import { useStore } from 'store';
import useActiveGroup from 'store/selectors/useActiveGroup';

import { verifyEpub, VerifiedEpub, checkTrx } from './split';
import { runLoading } from 'utils/runLoading';
import { MdDone, MdOutlinePending } from 'react-icons/md';
import classNames from 'classnames';

interface Props {
  className?: string
  rendition?: Rendition
  renderBox?: HTMLElement | null
}

type UploadStatus = 'pending' | 'uploading' | 'done';

export const EpubUploadButton = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,

    epub: null as null | VerifiedEpub,
    uploadProgress: [] as Array<[string, UploadStatus]>,
    uploading: false,

    get uploadDone() {
      return !!this.uploadProgress.length && this.uploadProgress.every((v) => v[1] === 'done');
    },
  }), { epub: observable.shallow });
  const activeGroup = useActiveGroup();
  const { snackbarStore } = useStore();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const progressBox = React.useRef<HTMLDivElement>(null);

  const handleSelectFile = async () => {
    runInAction(() => {
      state.epub = null;
    });
    const res = await dialog.showOpenDialog(getCurrentWindow(), {
      filters: [{
        name: '*',
        extensions: ['epub'],
      }],
    });
    if (res.canceled) {
      return;
    }
    try {
      const filePath = res.filePaths[0];
      const epub = await verifyEpub(filePath);
      runInAction(() => {
        state.epub = epub;
        state.uploadProgress = [
          ['fileinfo', 'pending'],
          ...epub.segments.map((v) => [v.id, 'pending'] as [string, UploadStatus]),
        ];
      });
    } catch (e) {
      const err = e as Error;
      snackbarStore.show({
        message: `err: ${err.message}`,
        type: 'error',
        duration: 2500,
      });
    }
  };

  const handleOpen = action(() => {
    state.open = true;

    const item = state.uploadProgress.find((v) => v[1] === 'uploading');
    if (!item) {
      return;
    }
    const e = progressBox.current?.querySelector(`[data-upload-item-id="${item[0]}"]`);
    if (e) {
      scrollIntoView(e, {
        scrollMode: 'if-needed',
        behavior: 'smooth',
      });
    }
  });

  const handleClose = action(() => {
    state.open = false;
    if (state.uploadDone) {
      setTimeout(() => {
        state.epub = null;
        state.uploadProgress = [];
      }, 300);
    }
  });

  const handleUpload = () => {
    const epub = state.epub;
    if (!epub || state.uploading) {
      return;
    }

    const changeStatus = action((name: string, status: UploadStatus) => {
      const item = state.uploadProgress.find((v) => v[0] === name);
      if (item) {
        item[1] = status;
      }
      const e = progressBox.current?.querySelector(`[data-upload-item-id="${name}"]`);
      if (e) {
        scrollIntoView(e, {
          scrollMode: 'if-needed',
          behavior: 'smooth',
        });
      }
    });

    runLoading(
      (l) => { state.uploading = l; },
      async () => {
        const groupId = activeGroup.group_id;
        const fileinfoContent = Buffer.from(JSON.stringify({
          ...epub,
          segments: epub.segments.map((v) => ({
            id: v.id,
            sha256: v.sha256,
          })),
        }));
        const data = {
          type: 'Add',
          object: {
            type: 'File',
            name: 'fileinfo',
            file: {
              compression: 0,
              mediaType: 'application/json',
              content: fileinfoContent.toString('base64'),
            },
          },
          target: {
            id: groupId,
            type: 'Group',
          },
        };
        changeStatus('fileinfo', 'uploading');
        const result = await contentApi.postNote(data as any);
        await checkTrx(result.trx_id, groupId);
        changeStatus('fileinfo', 'done');

        for (const seg of epub.segments) {
          const segData = {
            type: 'Add',
            object: {
              type: 'File',
              name: seg.id,
              file: {
                compression: 0,
                mediaType: 'application/octet-stream',
                content: seg.buf.toString('base64'),
              },
            },
            target: {
              id: groupId,
              type: 'Group',
            },
          };
          changeStatus(seg.id, 'uploading');
          const segResult = await contentApi.postNote(segData as any);
          await checkTrx(segResult.trx_id, groupId);
          console.log(`seg ${seg.id} info posted at ${segResult.trx_id}`);
          changeStatus(seg.id, 'done');
        }
      },
    );
  };

  return (<>
    <Button
      className={props.className}
      onClick={handleOpen}
      ref={buttonRef}
    >
      上传
    </Button>

    <Dialog
      open={state.open}
      onClose={handleClose}
      keepMounted
    >
      <div className="p-8 w-[400px]">
        <div className="flex gap-4">
          <Button
            onClick={handleSelectFile}
          >
            选择文件
          </Button>
          <Button
            onClick={handleUpload}
            disabled={state.uploading || !state.epub}
          >
            上传
          </Button>
        </div>

        {!!state.epub && (
          <div className="mt-4">
            <div className="flex-none">
              已选择：
            </div>
            <Tooltip
              title={state.epub.name}
              placement="bottom"
            >
              <div className="truncate">
                {state.epub.name}
              </div>
            </Tooltip>
            <Tooltip
              title={state.epub.title}
              placement="bottom"
            >
              <div className="truncate">
                {state.epub.title}
              </div>
            </Tooltip>
          </div>
        )}

        {!!state.uploadProgress.length && (
          <div className="mt-4">
            <div className="max-h-[250px] overflow-y-auto" ref={progressBox}>
              {state.uploadProgress.map(([name, status]) => (
                <div
                  className={classNames(
                    'flex items-center',
                    status === 'uploading' && 'bg-gray-f2',
                  )}
                  key={name}
                  data-upload-item-id={name}
                >
                  <div className="flex flex-center w-6 h-6 pt-px">
                    {status === 'pending' && (
                      <MdOutlinePending className="text-gray-88 text-16" />
                    )}
                    {status === 'uploading' && (
                      <CircularProgress size={14} className="text-blue-400" />
                    )}
                    {status === 'done' && (
                      <MdDone className="text-green-400 text-18" />
                    )}
                  </div>
                  <div className="text-14">
                    {name}
                  </div>
                </div>
              ))}
            </div>
            {state.uploadDone && (
              <div className="mt-4">
                上传完毕！
              </div>
            )}
          </div>
        )}

        {!state.uploadProgress.length && (
          <div className="mt-4">
            选择文件....
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button onClick={handleClose}>
            确定
          </Button>
        </div>
      </div>
    </Dialog>
  </>);
});
