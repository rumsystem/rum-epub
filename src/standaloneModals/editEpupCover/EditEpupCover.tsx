import { promises as fs } from 'fs';
import React from 'react';
import { pipe } from 'fp-ts/lib/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import ReactCrop, { Crop } from 'react-image-crop';
import { dialog, getCurrentWindow } from '@electron/remote';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { action, reaction, runInAction } from 'mobx';
import { Button, Checkbox, FormControlLabel } from '@mui/material';

import { BookCoverImg, Dialog } from '~/components';
import { bookService, tooltipService } from '~/service';
import { lang } from '~/utils';

export interface Props {
  groupId: string
  bookId: string
}

export const EditEpubCover = observer((props: Props & { destroy: () => unknown }) => {
  const state = useLocalObservable(() => ({
    open: true,
    lockRatio: true,

    fileBuffer: null as null | ArrayBuffer,
    blobUrl: '',
    croppedBuffer: null as null | ArrayBuffer,
    croppedBlobUrl: '',

    jobId: 0,
    get job() {
      return bookService.state.upload.coverJobs.find((v) => v.id === this.jobId);
    },
    get progressPercentage() {
      const done = this.job?.jobs.filter((v) => v.done).length ?? 0;
      const total = this.job?.jobs.length;
      if (!total) { return 0; }
      const progress = done / total;
      return `${(progress * 100).toFixed(2)}%`;
    },
  }));
  const [crop, setCrop] = React.useState<Crop>();
  const coverImage = React.useRef<HTMLImageElement>(null);

  const handleClose = action(() => {
    state.open = false;
    setTimeout(() => {
      props.destroy();
    }, 2000);
  });

  const trySelectFile = (file: ArrayBuffer) => {
    const validateFile = () => {
      const img = new Image();
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
        action(([file, src]) => {
          state.fileBuffer = file;
          state.blobUrl = src;
        }),
      ),
    )();
  };

  const handleDrop = async (e: React.DragEvent) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      const fileBuffer = await new Promise<ArrayBuffer>((rs, rj) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.addEventListener('load', () => rs(reader.result as ArrayBuffer));
        reader.addEventListener('error', (e) => rj(e));
      });
      trySelectFile(fileBuffer);
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
      ab = state.fileBuffer;
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

    runInAction(() => {
      if (!ab) { return; }
      state.croppedBuffer = ab;
      state.croppedBlobUrl = URL.createObjectURL(new Blob([ab]));
    });
  };

  const handleUpload = () => {
    const arrbuf = state.croppedBuffer;
    if (!arrbuf) { return; }
    const job = bookService.upload.createCoverJob({
      groupId: props.groupId,
      bookId: props.bookId,
      fileBuffer: Buffer.from(new Uint8Array(arrbuf)),
    });
    runInAction(() => {
      state.jobId = job.id;
    });
    bookService.upload.startCoverJob(job.id);
  };

  const handleReset = action(() => {
    state.fileBuffer = null;
    if (state.blobUrl) {
      URL.revokeObjectURL(state.blobUrl);
    }
    state.blobUrl = '';
    setCrop(undefined);
  });

  const handleResetCrop = action(() => {
    URL.revokeObjectURL(state.croppedBlobUrl);
    state.croppedBlobUrl = '';
    state.croppedBuffer = null;
  });

  React.useEffect(() => {
    const job = bookService.state.upload.coverJobs.find(
      (v) => v.groupId === props.groupId && v.bookId === props.bookId && !v.done,
    );
    if (job) {
      runInAction(() => {
        state.jobId = job.id;
      });
    }

    const disposes = [
      reaction(
        () => state.lockRatio,
        () => setCrop(undefined),
      ),
      () => {
        bookService.upload.deleteCoverJob(state.jobId);
        URL.revokeObjectURL(state.blobUrl);
        URL.revokeObjectURL(state.croppedBlobUrl);
      },
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
          {!state.job && !state.blobUrl && (<>
            <div className="flex-col items-center gap-y-4">
              <BookCoverImg
                groupId={props.groupId}
                bookId={props.bookId}
              >
                {(src) => (src ? (
                  <div>
                    <span className="text-gray-6f">
                      {lang.epubCover.currentCover}
                    </span>
                    <img className="max-w-[100px] mt-4" src={src} alt="" />
                  </div>
                ) : null)}
              </BookCoverImg>

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

            <div className="flex-col flex-center gap-y-4 mt-4">
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
            </div>
          </>)}
          {!state.job && !!state.blobUrl && !state.croppedBlobUrl && (<>
            <div className="flex flex-center">
              <ReactCrop
                className="max-w-[500px] max-h-[500px]"
                aspect={state.lockRatio ? 3 / 4 : undefined}
                crop={crop}
                onChange={(c) => setCrop(c)}
              >
                <img
                  ref={coverImage}
                  src={state.blobUrl}
                  alt=""
                />
              </ReactCrop>
            </div>

            <div className="flex-col flex-center gap-y-4 mt-4">
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
            </div>
          </>)}
          {!state.job && !!state.croppedBlobUrl && (<>
            <div className="flex flex-center">
              <img
                className="max-w-[500px] max-h-[500px]"
                src={state.croppedBlobUrl}
                alt=""
              />
            </div>

            <div className="flex justify-between gap-x-4 mt-4">
              <Button
                className="py-[6px] px-8 text-16 rounded-full"
                size="large"
                color="inherit"
                onClick={handleResetCrop}
              >
                {lang.epubCover.reCrop}
              </Button>
              <Button
                className="py-[6px] px-8 text-16 rounded-full"
                size="large"
                onClick={handleUpload}
              >
                {lang.epubCover.confirmUpload}
              </Button>
            </div>
          </>)}
          {!!state.job && !!state.croppedBlobUrl && (<>
            <div className="flex flex-center">
              <img
                className="max-w-[500px] max-h-[500px]"
                src={state.croppedBlobUrl}
                alt=""
              />
            </div>
            <div className="flex-col mt-4">
              <div className="border border-2 border-dashed h-8 p-1 w-full">
                <div
                  className="h-full bg-gray-ec duration-300"
                  style={{ width: state.job?.done ? '100%' : state.progressPercentage }}
                />
              </div>
              <div className="flex-col items-center gap-4 mt-4">
                {state.job?.done && lang.epubCover.uploadSuccess}
                {state.job?.done && (
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
            </div>
          </>)}
        </div>
      </div>
    </Dialog>
  );
});
