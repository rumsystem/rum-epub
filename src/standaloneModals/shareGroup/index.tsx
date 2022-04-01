import React from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs-extra';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { dialog } from '@electron/remote';
import { OutlinedInput } from '@mui/material';
import { IoMdCopy } from 'react-icons/io';
import { Dialog, Button } from '~/components';
import { sleep, runLoading } from '~/utils';
import { ThemeRoot } from '~/utils/theme';
import { lang } from '~/utils/lang';
import { setClipboard } from '~/utils/setClipboard';
import { fetchSeed } from '~/apis';
import { nodeService } from '~/service/node';
import { tooltipService } from '~/service/tooltip';

export const shareGroup = async (groupId: string) => new Promise<void>((rs) => {
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
        <ShareGroup
          groupId={groupId}
          rs={() => {
            rs();
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

export const shareSeed = async (seed: string) => new Promise<void>((rs) => {
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
        <ShareGroup
          seed={seed}
          rs={() => {
            rs();
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

type Props = { rs: () => unknown } & ({ groupId: string } | { seed: string });

const ShareGroup = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    loading: false,
    seed: null as null | Record<string, any>,
    groupName: '',
    get inGroup() {
      return nodeService.state.groups.some((v) => v.group_id === state.seed?.group_id);
    },
    get isActiveGroupSeed() {
      return nodeService.state.activeGroupId && state.seed?.group_id === nodeService.state.activeGroupId;
    },
  }));

  const handleDownloadSeed = async () => {
    try {
      const seed = JSON.stringify(state.seed, null, 2);
      const seedName = `seed.${state.groupName}.json`;
      if (!process.env.IS_ELECTRON) {
        // TODO: remove any in ts4.6
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: seedName,
          types: [{
            description: 'json file',
            accept: { 'text/json': ['.json'] },
          }],
        }).catch(() => null);
        if (!handle) {
          return;
        }
        const writableStream = await handle.createWritable();
        writableStream.write(seed);
        writableStream.close();
      } else {
        const file = await dialog.showSaveDialog({
          defaultPath: seedName,
        });
        if (file.canceled || !file.filePath) {
          return;
        }
        await fs.writeFile(file.filePath.toString(), seed);
      }
      await sleep(400);
      handleClose();
      tooltipService.show({
        content: lang.downloadedThenShare,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    setClipboard(JSON.stringify(state.seed, null, 2));
    tooltipService.show({
      content: lang.copied,
    });
  };

  const handleClose = action(() => {
    state.open = false;
    props.rs();
  });

  const handleJoinOrOpen = async () => {
    const groupId = state.seed?.group_id;
    if (state.inGroup) {
      nodeService.changeActiveGroup(groupId);
      handleClose();
      return;
    }
    if (state.loading) {
      return;
    }

    await runLoading(
      (l) => { state.loading = l; },
      async () => {
        try {
          const group = await nodeService.joinGroup(state.seed as any);
          nodeService.changeActiveGroup(group);
        } catch (err: any) {
          console.error(err);
          if (err.message.includes('existed')) {
            tooltipService.show({
              content: lang.existMember,
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

  React.useEffect(action(() => {
    if ('groupId' in props) {
      (async () => {
        try {
          if (props.groupId) {
            const seed = await fetchSeed(props.groupId);
            state.seed = seed;
            state.open = true;
            const group = nodeService.state.groups.find((v) => v.group_id === props.groupId);
            if (group) {
              state.groupName = group.group_name;
            }
          }
        } catch (_) {}
      })();
    } else {
      try {
        const seed = JSON.parse(props.seed);
        state.seed = seed;
        state.groupName = seed.group_name;
      } catch (e) {
      }
    }
  }), []);

  return (
    <Dialog
      open={state.open}
      maxWidth={false}
      onClose={handleClose}
    >
      <div className="bg-white rounded-0 text-center py-8 px-10 max-w-[500px]">
        <div className="text-18 font-medium text-gray-4a break-all">
          {state.isActiveGroupSeed ? lang.shareSeed : lang.seedNet}
        </div>
        <div className="px-3">
          <OutlinedInput
            className="mt-6 w-100 p-0"
            onFocus={(e) => e.target.select()}
            classes={{ input: 'p-4 text-12 leading-normal text-gray-9b' }}
            value={JSON.stringify(state.seed, null, 2)}
            multiline
            minRows={6}
            maxRows={10}
            spellCheck={false}
          />
        </div>

        <div className="text-16 text-gray-9b mt-5 flex justify-center items-center">
          <span
            className="text-link-blue cursor-pointer inline-flex items-center"
            onClick={handleCopy}
          >
            <IoMdCopy className="text-22 mr-1 inline" />
            {lang.copySeed}
          </span>
          <span>
            &nbsp;{lang.copySeedOr}
          </span>
        </div>

        <div className="flex justify-center mt-5 gap-x-4">
          <Button
            className="rounded-full !text-16"
            size="large"
            onClick={handleDownloadSeed}
          >
            {lang.downloadSeed}
          </Button>
          {!state.isActiveGroupSeed && (
            <Button
              className="rounded-full !text-16"
              size="large"
              onClick={handleJoinOrOpen}
              outline
              isDoing={state.loading}
            >
              {state.inGroup ? lang.openSeedGroup : lang.joinSeedGroup}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
});
