import { promises as fs } from 'fs';
import React from 'react';
import classNames from 'classnames';
import { pipe } from 'fp-ts/lib/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import ReactCrop, { Crop } from 'react-image-crop';
import { dialog, getCurrentWindow } from '@electron/remote';
import { createRoot } from 'react-dom/client';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { action, reaction, runInAction } from 'mobx';
import { Button, Checkbox, CircularProgress, FormControlLabel } from '@mui/material';
import FileBlankIcon from 'boxicons/svg/regular/bx-file-blank.svg?fill-icon';

import { Dialog } from '~/components';
import { ThemeRoot } from '~/utils/theme';
import { epubService, tooltipService } from '~/service';
import scrollIntoView from 'scroll-into-view-if-needed';
import { lang } from '~/utils';

export const editEpubCover = async () => new Promise<void>((rs) => {
  if (!epubService.state.current.bookTrx) {
    return;
  }
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
        <EditEpubCover
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
}

const EditEpubCover = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    groupId: '',
    bookTrx: '',
    lockRatio: true,
    scrollDebounceTimer: 0,

    image: null as null | ArrayBuffer,
    src: '',

    get groupItem() {
      return epubService.getGroupItem(this.groupId);
    },
    get uploadState() {
      return this.groupItem.upload.cover;
    },
    get progressPercentage() {
      const items = this.uploadState?.progress ?? [];
      if (!items.length) { return 0; }
      const doneItems = items.filter((v) => v.status === 'done').length;
      const progress = doneItems / items.length;
      return `${(progress * 100).toFixed(2)}%`;
    },
    get currentCover() {
      const book = this.groupItem.books.find((v) => v.trxId === state.bookTrx);
      return typeof book?.cover === 'string'
        ? book.cover
        : null;
    },
  }));
  const [crop, setCrop] = React.useState<Crop>();
  const coverImage = React.useRef<HTMLImageElement>(null);
  const progressBox = React.useRef<HTMLDivElement>(null);

  const handleClose = action(() => {
    state.open = false;
    props.rs();
  });

  const trySelectFile = (file: ArrayBuffer) => {
    const validateFile = () => {
      const img = new Image();
      if (img.src) {
        URL.revokeObjectURL(img.src);
      }
      const src = URL.createObjectURL(new Blob([file]));
      img.src = src;
      const p = new Promise<E.Either<ErrorEvent, [ArrayBuffer, string]>>((rs) => {
        img.addEventListener('load', () => {
          rs(E.right([file, src]));
        });
        img.addEventListener('error', (e) => {
          URL.revokeObjectURL(src);
          rs(E.left(e));
        });
      });
      return p;
    };
    pipe(
      validateFile,
      TE.matchW(
        () => {
          tooltipService.show({
            content: lang.epubCover.readFailed,
            type: 'error',
          });
        },
        ([file, src]) => {
          state.image = file;
          state.src = src;
        },
      ),
    )();
  };

  const handleDrop = (e: React.DragEvent) => {
    const file = e.dataTransfer.files[0];
    if (!file) {
      trySelectFile(file);
    }
  };

  const handleSelectFile = async () => {
    const res = await dialog.showOpenDialog(getCurrentWindow(), {
      filters: [{
        name: '*',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
      }],
    });
    if (res.canceled) { return; }
    try {
      const filePath = res.filePaths[0];
      const fileBuffer = await fs.readFile(filePath);
      trySelectFile(fileBuffer.buffer);
    } catch (e) {
      tooltipService.show({
        content: lang.epubCover.readFailed,
        type: 'error',
      });
    }
  };

  const handleCrop = async () => {
    const image = coverImage.current;
    let ab: ArrayBuffer | null;
    if (!image) { return; }
    if (!crop || !crop.height || !crop.width) {
      ab = state.image;
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = Math.floor(crop.width * scaleX);
      canvas.height = Math.floor(crop.height * scaleY);

      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
      );
      const blob = await new Promise<Blob | null>((rs) => canvas.toBlob(
        (b) => rs(b),
        'image/jpeg',
        0.95,
      ));
      ab = await blob?.arrayBuffer() ?? null;
    }

    if (!ab) { return; }
    epubService.upload.selectCover(state.groupId, state.bookTrx, ab);
  };

  const handleUpload = () => {
    epubService.upload.doUploadCover(state.groupId);
  };

  const handleReset = action(() => {
    state.image = null;
    if (state.src) {
      URL.revokeObjectURL(state.src);
    }
    state.src = '';
    epubService.upload.resetCover(state.groupId);
    setCrop(undefined);
  });

  const handleResetCrop = action(() => {
    epubService.upload.resetCover(state.groupId);
  });

  const loadCover = () => {
    epubService.parseMetadataAndCover(state.groupId, state.bookTrx);
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

  React.useEffect(() => {
    if (!epubService.state.current.bookTrx) {
      handleClose();
      return;
    }
    runInAction(() => {
      state.groupId = epubService.state.current.groupId;
      state.bookTrx = epubService.state.current.bookTrx;
    });
    loadCover();
  }, []);

  React.useEffect(() => {
    const disposes = [
      reaction(
        () => state.uploadState.progress.filter((v) => v.status === 'uploading'),
        () => {
          window.clearTimeout(state.scrollDebounceTimer);
          state.scrollDebounceTimer = window.setTimeout(scrollProgressIntoView, 300);
        },
      ),
      reaction(
        () => state.lockRatio,
        () => setCrop(undefined),
      ),
    ];
    return () => disposes.forEach((v) => v());
  }, []);

  return (
    <Dialog
      maxWidth={false}
      open={state.open}
      onClose={handleClose}
    >
      <div className="bg-white rounded-0 text-center p-8">
        <div className="text-22 font-bold">
          {lang.epubCover.editCover}
        </div>

        <div className="mt-4">
          {!state.uploadState.src && !state.src && (
            <div className="flex-col items-center gap-y-4">
              {!!state.currentCover && (
                <div>
                  <span className="text-gray-6f">
                    {lang.epubCover.currentCover}
                  </span>
                  <img className="max-w-[100px]" src={state.currentCover} alt="" />
                </div>
              )}

              <div
                className="flex flex-center border-2 border-dashed border-gray-c4 w-[500px] h-[230px] rounded"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="text-gray-9c text-16">
                  {lang.epubCover.dragCoverHere}
                  <br />
                  <br />
                  {lang.epubCover.supportFileTip}
                </div>
              </div>
            </div>
          )}
          {!state.uploadState.src && !!state.src && (
            <div className="flex flex-center">
              <ReactCrop
                className="max-w-[500px] max-h-[500px]"
                aspect={state.lockRatio ? 3 / 4 : undefined}
                crop={crop}
                onChange={(c) => setCrop(c)}
              >
                <img
                  ref={coverImage}
                  src={state.src}
                  alt=""
                />
              </ReactCrop>
            </div>
          )}
          {!!state.uploadState.src && (
            <div className="flex-col flex-center">
              <img
                className="max-w-[120px]"
                src={state.uploadState.src}
                alt=""
              />

              <div
                className={classNames(
                  'relative flex-col select-none p-2 mt-6',
                  'outline outline-2 w-[400px] outline-dashed outline-gray-c4 outline-offset-4',
                )}
              >
                <div
                  className={classNames(
                    'absolute left-0 top-0 h-full bg-gray-ec duration-300 min-w-[4px]',
                  )}
                  style={{ width: state.uploadState.uploadDone ? '100%' : state.progressPercentage }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-[210px] w-[400px] mt-4 mx-4 overflow-y-auto py-1" ref={progressBox}>
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
            </div>
          )}
        </div>

        <div className="flex-col flex-center gap-y-4 mt-4">
          {!state.uploadState.uploading && state.uploadState.uploadDone && (
            <div className="flex flex-center text-gray-4a text-16">
              {lang.epubCover.uploadSuccess}
            </div>
          )}
          {!state.uploadState.src && !state.src && (<>
            <div className="flex items-center self-stretch gap-x-12">
              <div className="flex-1 border-b border-gray-c4" />
              <div className="text-gray-9b">{lang.epubCover.or}</div>
              <div className="flex-1 border-b border-gray-c4" />
            </div>
            <Button
              className="py-[6px] px-8 text-16 rounded-full"
              size="large"
              onClick={handleSelectFile}
            >
              {lang.epubCover.selectCoverFile}
            </Button>
          </>)}
          {!state.uploadState.src && !!state.src && (
            <div className="flex-col items-center gap-y-4">
              <FormControlLabel
                control={(
                  <Checkbox
                    value={state.lockRatio}
                    onChange={action((e, v) => { state.lockRatio = v; })}
                    defaultChecked
                  />
                )}
                label={lang.epubCover.fixedRatio}
              />
              <div className="flex justify-between gap-x-4">
                <Button
                  className="py-[6px] px-8 text-16 rounded-full"
                  size="large"
                  color="inherit"
                  onClick={handleReset}
                >
                  {lang.epubCover.cancelSelect}
                </Button>
                <Button
                  className="py-[6px] px-8 text-16 rounded-full"
                  size="large"
                  onClick={handleCrop}
                >
                  {lang.epubCover.confirmCrop}
                </Button>
              </div>
            </div>
          )}

          {!!state.uploadState.src && (
            <div className="flex justify-between gap-x-4">
              {!state.uploadState.uploading && !state.uploadState.uploadDone && (
                <Button
                  className="py-[6px] px-8 text-16 rounded-full"
                  size="large"
                  color="inherit"
                  onClick={handleResetCrop}
                >
                  {lang.epubCover.reCrop}
                </Button>
              )}
              {!state.uploadState.uploadDone && (
                <Button
                  className="py-[6px] px-8 text-16 rounded-full"
                  size="large"
                  onClick={handleUpload}
                  disabled={state.uploadState.uploading}
                >
                  {state.uploadState.uploading && lang.epubCover.uploading}
                  {!state.uploadState.uploading && lang.epubCover.confirmUpload}
                </Button>
              )}
              {state.uploadState.uploadDone && (
                <Button
                  className="py-[6px] px-8 text-16 rounded-full"
                  size="large"
                  color="inherit"
                  onClick={() => { handleClose(); setTimeout(handleReset, 300); }}
                >
                  {lang.operations.closeWindow}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
});
