import React from 'react';
import fs from 'fs/promises';
import { dialog, getCurrentWindow, shell } from '@electron/remote';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { action, runInAction } from 'mobx';
import { TextField, Tooltip } from '@mui/material';
import { GoChevronRight } from 'react-icons/go';

import { Dialog, Button } from '~/components';
import { tooltipService, nodeService, bookService } from '~/service';
import { sleep, runLoading, lang } from '~/utils';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';

export interface Props {
  seed?: string
}

export interface InternalProps {
  destroy: () => unknown
  rs: (v?: string) => unknown
}

export const JoinGroup = observer((props: Props & InternalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
    loading: false,
    done: false,
    loadingSeed: false,
    seedString: props.seed ?? '',
  }));

  const submit = () => {
    if (state.loading) { return; }
    runInAction(() => { state.done = false; });
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        try {
          const group = await nodeService.joinGroup(state.seedString);
          if (group.app_key === GROUP_TEMPLATE_TYPE.EPUB) {
            bookService.openBook({ groupId: group.group_id });
          }
          if (group.app_key === GROUP_TEMPLATE_TYPE.EPUB_LINK) {
            bookService.openBook({ linkGroupId: group.group_id });
          }
          runInAction(() => { state.done = true; });
          props.rs(group.group_id);
          handleClose();
        } catch (err: any) {
          console.error(err);
          if (err.message.includes('existed')) {
            await sleep(400);
            runInAction(() => { state.done = true; });
            handleClose();
            tooltipService.show({
              content: lang.joinGroup.existMember,
              type: 'error',
            });
            return;
          }
          tooltipService.show({
            content: lang.somethingWrong,
            type: 'error',
          });
        }
      },
    );
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      submit();
    }
  };

  const handleSelectFile = async () => {
    if (state.loading) { return; }
    runInAction(() => {
      state.loadingSeed = true;
    });
    try {
      const file = await dialog.showOpenDialog(getCurrentWindow(), {
        filters: [{ name: 'json', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (!file.canceled && file.filePaths) {
        const seedString = await fs.readFile(
          file.filePaths[0].toString(),
          'utf8',
        );
        await sleep(500);
        runInAction(() => {
          state.seedString = seedString;
        });
      }
    } catch (err) {
      console.error(err);
    }
    runInAction(() => {
      state.loadingSeed = false;
    });
  };

  const handleClose = action(() => {
    state.open = false;
    props.rs();
    setTimeout(props.destroy, 2000);
  });

  return (
    <Dialog open={state.open} onClose={handleClose}>
      <div className="bg-white rounded-0 text-center p-8 pb-4">
        <div className="w-72">
          <div className="text-18 font-bold text-gray-700">{lang.joinGroup.joinGroup}</div>
          <TextField
            className="w-full text-12 px-4 pt-5"
            placeholder={lang.joinGroup.pasteSeedText}
            size="small"
            multiline
            minRows={6}
            maxRows={6}
            value={state.seedString}
            autoFocus
            onChange={action((e) => { state.seedString = e.target.value; })}
            onKeyDown={handleInputKeyDown}
            margin="dense"
            variant="outlined"
          />

          <div className="text-12 mt-2 flex items-center justify-center text-gray-400">
            <div>{lang.or}</div>
            <Tooltip
              disableHoverListener={!!state.seedString}
              placement="top"
              title={lang.joinGroup.selectSeedToJoin}
              arrow
            >
              <div className="flex items-center cursor-pointer font-bold text-gray-500 opacity-90" onClick={handleSelectFile}>
                {lang.joinGroup.selectSeedFile}
                <GoChevronRight className="text-12 opacity-80" />
              </div>
            </Tooltip>
          </div>

          <div className="mt-4 pt-[2px]">
            <Button
              fullWidth
              isDoing={state.loading}
              isDone={state.done}
              disabled={!state.seedString}
              onClick={submit}
            >
              {lang.operations.confirm}
            </Button>
            <div
              className="mt-2 pt-[2px] text-gray-500 hover:text-black text-12 cursor-pointer text-center opacity-70"
              onClick={() => {
                shell.openExternal('https://docs.prsdev.club/#/rum-app/');
              }}
            >
              {lang.joinGroup.availablePublicGroups}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
});
