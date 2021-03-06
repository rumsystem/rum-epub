import React from 'react';
import classNames from 'classnames';
import { Dialog, Tooltip } from '@mui/material';
import { avatars } from '~/utils/avatars';
import { Scrollable } from '~/components';
import { lang } from '~/utils';

interface Props {
  open: boolean
  onClose: () => unknown
  onSelect: (base64Img: string) => unknown
}

export const PresetAvatarsDialog = (props: Props) => {
  const handleSelectImg = async (src: string) => {
    const buf = await (await fetch(src)).arrayBuffer();
    const uint8arr = new Uint8Array(buf);
    const data = window.btoa(String.fromCharCode(...Array.from(uint8arr)));
    const base64 = `data:image/png;base64,${data}`;
    props.onSelect(base64);
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      maxWidth={false}
    >
      <div className="bg-white rounded-0 text-center">
        <div className="text-18 font-bold mt-8 mb-4">{lang.avatar.selectAvatar}</div>
        <Scrollable
          className="max-h-[400px]"
        >
          {/* className="img-box overflow-y-auto pt-2 pb-3 px-8 mb-8 w-[90vw] max-h-[400px]" */}
          <div
            className="img-grid-box grid gap-x-2 gap-y-3 p-5 justify-center"
            style={{
              width: `${80 * 6 + 8 * 5 + 24 * 2}px`,
              gridTemplateColumns: 'repeat(auto-fill, 80px)',
            }}
          >
            {avatars.map((url: string) => (
              <Tooltip
                enterDelay={500}
                enterNextDelay={500}
                classes={{
                  tooltip: 'p-0 bg-white shadow-6 rounded-lg overflow-hidden',
                }}
                placement="top"
                title={
                  <div className="p-2">
                    <img className="w-40 h-40" src={url} alt="" />
                  </div>
                }
                key={url}
              >
                <div
                  className={classNames(
                    'group w-20 h-20 p-1 rounded overflow-hidden cursor-pointer relative',
                    'hover:shadow-6 hover:z-10',
                  )}
                  onClick={() => handleSelectImg(url)}
                >
                  <img className="w-full h-full" src={url} alt="" />
                </div>
              </Tooltip>
            ))}
          </div>
        </Scrollable>
      </div>
    </Dialog>
  );
};
