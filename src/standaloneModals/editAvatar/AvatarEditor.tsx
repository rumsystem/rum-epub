import React from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import ReactAvatarEditor from 'react-avatar-editor';
import { RiZoomInLine, RiZoomOutLine } from 'react-icons/ri';
import { Button, Dialog, Slider } from '@mui/material';
import { lang } from '~/utils';

interface Props {
  open: boolean
  onClose?: () => unknown
  onConfirm?: (img: string) => unknown
  img: string
}

const EDITOR_SIZE = 200;
export const AvatarEditor = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,
    scale: 1,
  }));
  const avatarEditorRef = React.useRef<ReactAvatarEditor>(null);

  const handleAvatarSubmit = () => {
    const canvas = avatarEditorRef.current!.getImage();
    const img = canvas.toDataURL('image/jpeg', 0.9);
    props.onConfirm?.(img);
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
    >
      <div>
        <div>
          <div className="text-center text-18 pt-8 pb-4 font-bold">
            {lang.avatar.moveOrDragImage}
          </div>
        </div>
        <div className="px-10 mt-2">
          <div className="md:mx-5 w-[220px]">
            <div
              className="relative mx-auto"
              style={{
                width: EDITOR_SIZE,
                height: EDITOR_SIZE,
              }}
            >
              <div
                className="top-0 canvas-container absolute"
                style={{
                  transform: 'translateX(-50%)',
                  left: '50%',
                }}
              >
                <ReactAvatarEditor
                  ref={avatarEditorRef}
                  width={EDITOR_SIZE}
                  height={EDITOR_SIZE}
                  border={0}
                  scale={state.scale}
                  image={props.img}
                />
              </div>
            </div>

            <div className="slider-box flex items-center py-1 pl-4 pr-2 mt-[0px] text-xl text-gray-500 relative">
              <div className="text-20 opacity-50 absolute top-0 left-0 mt-[9px] -ml-6">
                <RiZoomOutLine />
              </div>
              <Slider
                step={0.01}
                min={1}
                max={4}
                onChange={action((_e, v) => { state.scale = v as number; })}
              />
              <div className="text-20 opacity-50 absolute top-0 right-0 mt-[9px] -mr-6">
                <RiZoomInLine />
              </div>
            </div>
            <div className="flex justify-center gap-x-6 mt-4 px-3 pb-8 ">
              <Button
                className="px-6"
                color="inherit"
                onClick={props.onClose}
              >
                {lang.operations.back}
              </Button>
              <Button
                className="px-6"
                onClick={handleAvatarSubmit}
              >
                {lang.operations.confirm}
              </Button>
            </div>
          </div>
          <style jsx>{`
        .canvas-container {
          transform-origin: top;
        }
      `}</style>
        </div>
      </div>
    </Dialog>
  );
});
