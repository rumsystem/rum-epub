import React from 'react';
import classNames from 'classnames';
import { createRoot } from 'react-dom/client';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { MdEdit } from 'react-icons/md';
import { FormControl, InputLabel, OutlinedInput } from '@mui/material';

import { Dialog, Button, GroupIcon, Loading } from '~/components';
import ImageEditor from '~/components/ImageEditor';

import { sleep, runLoading } from '~/utils';
import { GROUP_CONFIG_KEY } from '~/utils/constant';
import { ThemeRoot } from '~/utils/theme';
import { changeGroupConfig } from '~/apis';
import { lang } from '~/utils/lang';

import { tooltipService } from '~/service/tooltip';
import { nodeService } from '~/service/node';

export const manageGroup = async (groudId: string, init = false) => new Promise<void>((rs) => {
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
        <ManageGroup
          groudId={groudId}
          init={init}
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
  groudId: string
  init: boolean
  rs: () => unknown
}

const ManageGroup = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    initiating: false,
    loading: false,

    firstLetter: '',
    originalDesc: '',
    originalIcon: '',

    name: '',
    icon: '',
    desc: '',
  }));

  const group = nodeService.state.groupMap[props.groudId];

  const handleSave = async () => {
    const groupId = props.groudId;
    runInAction(() => {
      state.loading = true;
    });

    try {
      // it take several second to sync
      await sleep(400);
      await Promise.all([
        state.icon !== state.originalIcon && changeGroupConfig({
          group_id: groupId,
          action: state.icon ? 'add' : 'del',
          name: GROUP_CONFIG_KEY.GROUP_ICON,
          type: 'string',
          value: state.icon ? state.icon : 'holder',
        }),
        state.desc !== state.originalDesc && changeGroupConfig({
          group_id: groupId,
          action: state.desc ? 'add' : 'del',
          name: GROUP_CONFIG_KEY.GROUP_DESC,
          type: 'string',
          value: state.desc ? state.desc : 'holder',
        }),
      ]);
      tooltipService.show({
        content: lang.savedAndWaitForSyncing,
      });
    } catch (e) {
      tooltipService.show({
        content: lang.somethingWrong,
        type: 'error',
      });
    }
    runInAction(() => {
      state.loading = false;
    });
    handleClose();
  };

  const handleClose = action(() => {
    state.open = false;
    props.rs();
  });
  const init = async () => {
    const groudId = props.groudId;
    const group = nodeService.state.groupMap[groudId];

    if (!group) {
      handleClose();
      return;
    }

    await runLoading(
      (l) => { state.initiating = l; },
      async () => {
        await nodeService.updateGroupConfig(groudId);
        const config = nodeService.state.configMap.get(groudId);

        runInAction(() => {
          state.name = group.group_name;
          state.firstLetter = group.group_name.substring(0, 1);
          state.desc = String(config?.[GROUP_CONFIG_KEY.GROUP_DESC] ?? '');
          state.icon = String(config?.[GROUP_CONFIG_KEY.GROUP_ICON] ?? '');

          state.originalDesc = state.desc;
          state.originalIcon = state.icon;
        });
      },
    );
  };

  React.useEffect(() => {
    init();
  }, []);

  if (!group) {
    return null;
  }

  return (
    <Dialog
      open={state.open}
      onClose={handleClose}
    >
      <div className="bg-white rounded-0 p-6 w-[550px]">
        <div className="pt-4 px-6 pb-5">
          <div className="text-18 font-bold text-gray-700 text-center pb-5">
            {lang.manageGroupTitle}
          </div>
          {state.initiating && (
            <div className="flex flex-center h-[360px] pb-10">
              <Loading />
            </div>
          )}
          {!state.initiating && (<>
            <div className="">
              <div className="flex flex-center mt-4">
                <div className="w-20 h-20 rounded-sm border border-gray-400 relative overflow-hidden bg-gray-c4">
                  <ImageEditor
                    className="opacity-0 !absolute !m-0 -inset-px"
                    width={200}
                    placeholderWidth={90}
                    editorPlaceholderWidth={200}
                    imageUrl={state.icon}
                    getImageUrl={(url: string) => {
                      state.icon = url;
                    }}
                  />
                  <GroupIcon
                    width={80}
                    height={80}
                    fontSize={48}
                    group={group}
                    groupIcon={state.icon}
                  />
                  <div
                    className={classNames(
                      'w-5 h-5 -mb-px -mr-px absolute right-0 bottom-0 rounded-sm',
                      'bg-gray-4a bg-opacity-40 text-white flex flex-center',
                    )}
                  >
                    <MdEdit />
                  </div>
                </div>
              </div>
              <FormControl className="mt-8 w-full" variant="outlined" disabled>
                <InputLabel>{lang.groupName}</InputLabel>
                <OutlinedInput
                  label={lang.groupName}
                  value={state.name}
                  disabled
                  spellCheck={false}
                />
              </FormControl>

              <FormControl className="mt-8 w-full" variant="outlined">
                <InputLabel>{lang.desc}</InputLabel>
                <OutlinedInput
                  label={lang.desc}
                  value={state.desc}
                  onChange={action((e) => { state.desc = e.target.value; })}
                  multiline
                  minRows={3}
                  maxRows={6}
                  spellCheck={false}
                />
              </FormControl>
            </div>

            <div className="flex flex-col flex-center mt-8 text-16">
              <Button
                className='w-36 h-9'
                isDoing={state.loading}
                onClick={handleSave}
              >
                <span className="text-16">
                  {lang.save}
                </span>
              </Button>

              {props.init && (
                <span
                  className="mt-5 text-link-blue cursor-pointer text-14"
                  onClick={handleClose}
                >
                  {lang.manageGroupSkip}
                </span>
              )}
            </div>
          </>)}
        </div>
      </div>
    </Dialog>
  );
});
