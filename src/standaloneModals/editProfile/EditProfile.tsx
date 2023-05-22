import { observer, useLocalObservable } from 'mobx-react-lite';
import { action } from 'mobx';
import { Dialog, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import { ImageEditor } from '~/components';
import { Profile, linkGroupService, tooltipService } from '~/service';
import { base64, lang, runLoading } from '~/utils';


export interface Props {
  groupId: string
  profile?: Profile | null
}

export const EditProfile = observer((props: Props & { destroy: () => unknown }) => {
  const state = useLocalObservable(() => ({
    open: true,
    loading: false,
    done: false,
    name: props.profile?.name ?? '',
    avatar: {
      mediaType: props.profile?.avatar?.mediaType ?? '',
      content: props.profile?.avatar?.content ?? '',
    },
  }));

  const handleClose = action(() => {
    state.open = false;
    setTimeout(props.destroy, 2000);
  });

  const submitProfile = async () => {
    if (!state.name) {
      tooltipService.show({
        content: lang.require(lang.profile.nickname),
        type: 'error',
      });
      return;
    }

    await runLoading(
      (l) => { state.loading = l; },
      async () => {
        try {
          await linkGroupService.profile.submit({
            name: state.name,
            avatar: state.avatar.content && state.avatar.mediaType ? {
              content: state.avatar.content,
              mediaType: state.avatar.mediaType,
            } : undefined,
            groupId: props.groupId,
          });
          handleClose();
        } catch (err) {
          console.error(err);
          tooltipService.show({
            content: (err as Error).message || lang.somethingWrong,
            type: 'error',
          });
        }
      },
    );
  };

  return (
    <Dialog open={state.open} onClose={handleClose}>
      <div className="w-100 bg-white rounded-lg text-center pb-8 pt-12 px-12">
        <div>
          <div className="text-16 font-bold text-gray-4a">
            {lang.profile.editProfile}
          </div>
          <div className="mt-6">
            <div className="flex border border-gray-200 px-6 py-8 rounded-0">
              <div className="flex justify-center mr-5 pb-2">
                <ImageEditor
                  roundedFull
                  width={200}
                  placeholderWidth={90}
                  editorPlaceholderWidth={200}
                  showAvatarSelect
                  avatarMaker
                  imageUrl={state.avatar.content ? base64.getUrl(state.avatar) : ''}
                  getImageUrl={action((url: string) => {
                    state.avatar = {
                      mediaType: base64.getMimeType(url),
                      content: base64.getContent(url),
                    };
                  })}
                />
              </div>
              <div className="flex items-center">
                <TextField
                  className="w-full opacity-80"
                  label={lang.profile.nickname}
                  size="small"
                  value={state.name}
                  onChange={action((e) => {
                    state.name = e.target.value.trim().slice(0, 40);
                  })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                      submitProfile();
                    }
                  }}
                  margin="dense"
                  variant="outlined"
                />
              </div>
            </div>
          </div>

          <div className="mt-10" onClick={submitProfile}>
            <LoadingButton
              className="rounded w-[160px] h-10"
              variant="contained"
              loading={state.loading}
            >
              ok
              {/* {lang.yes} */}
            </LoadingButton>
          </div>
        </div>
      </div>
    </Dialog>
  );
});
