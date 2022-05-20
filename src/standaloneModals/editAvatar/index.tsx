import React from 'react';
import { createRoot } from 'react-dom/client';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { action, runInAction } from 'mobx';
import { Button } from '@mui/material';
import { shell } from '@electron/remote';

import { Dialog } from '~/components';
import { ThemeRoot } from '~/utils/theme';
import { PresetAvatarsDialog } from './PresetAvatarsDialog';
import { AvatarEditor } from './AvatarEditor';

export const editAvatar = async () => new Promise<string | null>((rs) => {
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
        <EditAvatar
          rs={(v) => {
            rs(v);
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

interface Props {
  rs: (v: string | null) => unknown
}

const EditAvatar = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    presetAvatar: false,
    avatarEditor: false,

    img: '',
  }));
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleSelectAvatar = action((base64: string) => {
    props.rs(base64);
    state.presetAvatar = false;
    state.avatarEditor = false;
    state.open = false;
  });

  const handleAvatarInputChange = () => {
    const file = avatarInputRef.current!.files![0];
    avatarInputRef.current!.value = '';
    if (!file) { return; }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const url = reader.result as string;
      runInAction(() => {
        state.img = url;
        state.avatarEditor = true;
      });
    });
    reader.readAsDataURL(file);
  };

  const handleClose = action(() => {
    state.open = false;
    props.rs(null);
  });

  return (<>
    <input
      ref={avatarInputRef}
      hidden
      onChange={handleAvatarInputChange}
      accept="image/*"
      type="file"
    />

    <Dialog
      maxWidth={false}
      open={state.open}
      onClose={handleClose}
    >
      <div className="bg-white rounded-0 text-center p-8">
        <div className="text-16 font-bold">
          选择操作方式
        </div>
        <div className="flex-col items-stertch gap-y-3 w-50 mt-6">
          <Button
            onClick={action(() => { state.presetAvatar = true; })}
          >
            选择头像
          </Button>
          <Button onClick={() => { avatarInputRef.current!.click(); }}>
            上传图片
          </Button>
          <Button
            onClick={() => {
              shell.openExternal('https://cvbox.org/avatar');
            }}
          >
            捏头像
          </Button>
        </div>
      </div>
    </Dialog>

    <PresetAvatarsDialog
      open={state.presetAvatar}
      onClose={action(() => { state.presetAvatar = false; })}
      onSelect={handleSelectAvatar}
    />

    <AvatarEditor
      open={state.avatarEditor}
      img={state.img}
      onClose={action(() => { state.avatarEditor = false; })}
      onConfirm={handleSelectAvatar}
    />
  </>);
});
