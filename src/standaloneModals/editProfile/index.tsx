import React from 'react';
import { createRoot } from 'react-dom/client';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, CircularProgress, Fade, FormControl, InputLabel, OutlinedInput } from '@mui/material';
import { ChevronLeft, ChevronRight, Edit } from '@mui/icons-material';

import { ThemeRoot } from '~/utils/theme';
import { defaultAvatar } from '~/utils/avatars';
import { Avatar } from '~/components';
import { GlobalProfile, profileService, tooltipService, escService } from '~/service';
import { runLoading } from '~/utils';
import { editAvatar } from '~/standaloneModals/editAvatar';

let canOpen = true;
export const editProfile = async () => new Promise<void>((rs) => {
  if (!canOpen) { return; }
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
        <EditProfile
          rs={() => {
            rs();
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

const EditProfile = observer((props: { rs: () => unknown }) => {
  const state = useLocalObservable(() => ({
    open: true,
    loading: false,
    form: {
      avatar: '',
      name: '',
      mixinUID: '',
    },
    initForm: {
      avatar: '',
      name: '',
      mixinUID: '',
    },
    dispose: escService.noop,
  }));

  const handleClose = action(() => {
    if (state.loading) { return; }
    props.rs();
    state.open = false;
    canOpen = true;
    state.dispose();
  });

  const handleEditAvatar = async () => {
    const img = await editAvatar();
    if (img) {
      runInAction(() => {
        state.form.avatar = img;
      });
    }
  };

  const handleConfirm = () => {
    const notChanged = Object.entries(state.form).every(([k, v]) => v === (state.initForm as any)[k]);
    if (notChanged) {
      handleClose();
      return;
    }
    const profile: GlobalProfile['profile'] = {
      name: state.form.name,
    };
    if (state.form.avatar.startsWith('data:')) {
      profile.image = {
        mediaType: /data:(.*)(?=;base64)/.exec(state.form.avatar)![1],
        content: state.form.avatar.split(';base64,')[1],
      };
    }
    if (state.form.mixinUID) {
      profile.wallet = [{
        id: state.form.mixinUID,
        type: 'mixin',
        name: 'mixin messenger',
      }];
    }

    runLoading(
      (l) => { state.loading = l; },
      async () => {
        await profileService.setProfile(profile);
        tooltipService.show({
          content: '修改成功！',
        });
        setTimeout(handleClose);
      },
    );

    // const payload = {
    //   type: 'Update',
    //   person: profile,
    //   target: {
    //     // id: data.groupId,
    //     type: 'Group',
    //   },
    // };
    // const res = await TE.tryCatch(
    //   () => updateProfile(payload),
    //   identity,
    // )();
    // if (E.isLeft(res)) {
    //   return;
    // }
    // TODO: set global profile
    // dbService.db.profile.put({
    //   status: 'syncing',
    //   groupId,
    //   profile,
    //   publisher,
    // });
  };

  const loadProfile = () => {
    const getProfile = () => ({
      name: profileService.state.currentProfile.name,
      avatar: profileService.state.currentProfile.image?.content
        ? `data:image/jpeg/;base64,${profileService.state.currentProfile.image?.content}`
        : '',
      mixinUID: profileService.state.currentProfile.wallet?.find((v) => v.type === 'mixin')?.id ?? '',
    });
    runInAction(() => {
      state.form = getProfile();
      state.initForm = getProfile();
    });
  };

  React.useEffect(() => {
    canOpen = false;
    loadProfile();
    state.dispose = escService.add(handleClose);
  }, []);

  return (
    <Fade
      in={state.open}
      timeout={300}
      mountOnEnter
      unmountOnExit
    >
      <div className="flex flex-col items-stretch fixed inset-0 top-[40px] bg-gray-f7 z-50">
        <div className="flex flex-none gap-x-10 px-10 h-17 items-center bg-white">
          <button
            className="flex flex-center text-16"
            onClick={handleClose}
          >
            <ChevronLeft className="text-producer-blue" />
            返回
          </button>
          <div className="text-20 font-bold">
            设置个人信息
          </div>
        </div>

        <div className="flex-col flex-center flex-1 h-0 p-12">
          <div className="overflow-auto w-[800px]">
            <div className="flex-col flex-center gap-y-8 bg-white px-22 py-10 min-h-[650px] text-gray-4a">
              <div className="font-bold text-16">
                编辑个人信息
              </div>
              <div className="flex items-center gap-x-6 border border-gray-ec p-10 rounded">
                <div
                  className="relative"
                  onClick={handleEditAvatar}
                >
                  <Avatar
                    url={state.form.avatar || defaultAvatar}
                    size={96}
                  />
                  <div className="flex-col flex-center rounded-full absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 cursor-pointer select-none">
                    <Edit className="text-white" />
                    <span className="text-white">
                      更换
                    </span>
                  </div>
                </div>
                <div className="flex-col gap-y-3">
                  <FormControl className="w-full" variant="outlined" size="small">
                    <InputLabel className="text-14">
                      昵称
                    </InputLabel>
                    <OutlinedInput
                      className="text-14"
                      label="昵称"
                      value={state.form.name}
                      onChange={action((e) => { state.form.name = e.target.value; })}
                    />
                  </FormControl>
                  <div className="">
                    <button className="flex items-center text-12 text-gray-9c">
                      {/* TODO: */}
                      绑定钱包
                      <ChevronRight className="text-20" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-center gap-x-8">
                <Button
                  className="min-w-[120px]"
                  onClick={handleClose}
                  color="inherit"
                >
                  取消
                </Button>
                <Button
                  className="min-w-[120px]"
                  onClick={handleConfirm}
                  disabled={state.loading}
                >
                  确定
                  {state.loading && (
                    <CircularProgress
                      className="text-white ml-2"
                      size={16}
                      thickness={5}
                    />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fade>
  );
});
