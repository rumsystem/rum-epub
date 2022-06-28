import path from 'path';
import React from 'react';
import { action, reaction, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import classNames from 'classnames';
import { render, unmountComponentAtNode } from 'react-dom';
import { format } from 'date-fns';
import fs from 'fs-extra';
import { dialog, getCurrentWindow } from '@electron/remote';
import { Tooltip } from '@mui/material';

import {
  Dialog,
  Button,
  PasswordInput,
} from '~/components';
import { ThemeRoot } from '~/utils/theme';
import { lang } from '~/utils/lang';
import { formatPath } from '~/utils';
import * as Quorum from '~/service/quorum/helper';
import {
  dialogService,
  loadingService,
  nodeService,
  quorumService,
  tooltipService,
} from '~/service';

export const exportKeyData = async () => new Promise<void>((rs) => {
  const div = document.createElement('div');
  document.body.append(div);
  const unmount = () => {
    unmountComponentAtNode(div);
    div.remove();
  };
  render(
    (
      <ThemeRoot>
        <ExportKeyData
          rs={() => {
            rs();
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
    div,
  );
});

interface Props {
  rs: () => unknown
}

enum STEP {
  // SELECT_MODE = 1,
  SELECT_SOURCE = 2,
  SELECT_TARGET = 3,
  INPUT_PASSWORD = 4,
}

const ExportKeyData = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    mode: process.env.IS_ELECTRON ? 'native' : 'wasm',
    step: STEP.SELECT_SOURCE,
    open: true,
    loading: false,
    done: false,
    backupPath: null as any,
    backupPathHandle: null as any,
    password: '',
    storagePath: '',
  }));

  const submit = async () => {
    if (state.loading) { return; }

    // if (state.step === STEP.SELECT_MODE && !process.env.IS_ELECTRON) {
    //   runInAction(() => { state.step = STEP.SELECT_TARGET; });
    //   return;
    // }

    if (state.step === STEP.SELECT_TARGET && !process.env.IS_ELECTRON) {
      runInAction(() => {
        state.step = STEP.INPUT_PASSWORD;
        state.password = 'password';
      });
      return;
    }

    if (state.step < STEP.INPUT_PASSWORD) {
      runInAction(() => { state.step += 1; });
      return;
    }

    if (state.step === STEP.INPUT_PASSWORD) {
      runInAction(() => {
        state.loading = true;
        state.done = false;
      });

      try {
        if (!process.env.IS_ELECTRON) {
          // const data = await qwasm.BackupWasmRaw(state.password);
          // if (state.backupPathHandle) {
          //   const writableStream = await state.backupPathHandle.createWritable();
          //   writableStream.write(data);
          //   writableStream.close();
          // }
          // tooltipService.show({
          //   content: lang.backup.exportKeyDataDone,
          // });
          // handleClose();
        } else {
          const { error } = state.mode === 'native'
            ? await Quorum.exportKey({
              backupPath: state.backupPath,
              storagePath: state.storagePath,
              password: state.password,
            })
            : await Quorum.exportKeyWasm({
              backupPath: state.backupPath,
              storagePath: state.storagePath,
              password: state.password,
            });
          if (!error) {
            runInAction(() => {
              state.done = true;
            });
            tooltipService.show({
              content: lang.backup.exportKeyDataDone,
            });
            handleClose();
            return;
          }
          if (error.includes('could not decrypt key with given password')) {
            tooltipService.show({
              content: lang.backup.incorrectPassword,
              type: 'error',
            });
            return;
          }
          if (error.includes('permission denied')) {
            tooltipService.show({
              content: lang.backup.writePermissionDenied,
              type: 'error',
            });
            return;
          }
          tooltipService.show({
            content: lang.somethingWrong,
            type: 'error',
          });
        }
      } catch (err: any) {
        console.error(err);
        tooltipService.show({
          content: lang.somethingWrong,
          type: 'error',
        });
      } finally {
        runInAction(() => {
          state.loading = false;
        });
      }
    }
  };

  const handleSelectRumDir = async () => {
    const isRumDataFolder = async (p: string) => {
      const stat = await (async () => {
        try {
          const stat = await fs.stat(p);
          return { right: stat };
        } catch (e) {
          return { left: e as NodeJS.ErrnoException };
        }
      })();

      if (stat.left || !stat.right.isDirectory()) {
        return false;
      }
      const files = await fs.readdir(p);
      return files.some((v) => v === 'peerConfig');
    };
    const includeKeystoreFolder = async (p: string) => {
      const files = await fs.readdir(p);
      return files.some((v) => v === 'keystore');
    };
    const selectePath = async () => {
      const file = await dialog.showOpenDialog(getCurrentWindow(), {
        properties: ['openDirectory'],
      });
      const p = file.filePaths[0];
      if (file.canceled || !file.filePaths.length || state.storagePath === p) {
        return null;
      }
      return p;
    };

    const selectedPath = await selectePath();
    if (!selectedPath) {
      return;
    }

    const paths = [
      selectedPath,
      path.join(selectedPath, 'rum'),
    ];

    let noKeystoreFolder = false;

    await quorumService.internal.updateStatus();
    const storagePath = quorumService.state.storagePath;
    for (const p of paths) {
      if (await isRumDataFolder(p)) {
        if (await includeKeystoreFolder(p)) {
          if (storagePath === p) {
            const result = await dialogService.open({
              content: lang.backup.exportCurrentNodeNeedToQuit,
              confirm: lang.operations.confirm,
              danger: true,
            });
            if (result === 'confirm') {
              if (!process.env.IS_ELECTRON) {
                return;
              }
              loadingService.add(lang.node.exitingNode);
              await Promise.allSettled([
                nodeService.resetNodeConfig(),
                quorumService.internal.down(),
              ]);
              window.location.reload();
            }
          } else {
            runInAction(() => {
              state.storagePath = p;
            });
          }
          return;
        }
        noKeystoreFolder = true;
      }
    }

    tooltipService.show({
      content: noKeystoreFolder ? lang.backup.keyStoreNotExist : lang.backup.nodeDataNotExist,
      type: 'error',
      timeout: 4000,
    });
  };

  const handleSelectDir = async () => {
    if (!process.env.IS_ELECTRON) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'backup.json',
        types: [{
          description: 'json file',
          accept: { 'text/json': ['.json'] },
        }],
      }).catch(() => null);
      if (!handle) { return; }
      runInAction(() => {
        state.backupPathHandle = handle;
      });
      return;
    }

    const isNotExistFolder = async (p: string) => {
      const exist = await (async () => {
        try {
          const stat = await fs.stat(p);
          return { right: stat };
        } catch (e) {
          return { left: e as NodeJS.ErrnoException };
        }
      })();
      const notExist = !!exist.left && exist.left.code === 'ENOENT';
      return notExist;
    };

    const selectePath = async () => {
      const file = await dialog.showOpenDialog(getCurrentWindow(), {
        properties: ['openDirectory'],
      });
      const p = file.filePaths[0];
      if (file.canceled || !file.filePaths.length || state.storagePath === p) {
        return null;
      }
      return p;
    };

    const selectedPath = await selectePath();
    if (!selectedPath) {
      return;
    }

    const date = format(new Date(), 'yyyyMMdd');
    const paths = [
      path.join(selectedPath, 'rum-backup'),
      path.join(selectedPath, `rum-backup-${date}`),
    ];

    for (const p of paths) {
      if (await isNotExistFolder(p)) {
        runInAction(() => {
          state.backupPath = p;
        });
        return;
      }
    }

    const files = await fs.readdir(selectedPath);
    // find the max index in `rum-${date}-${index}`
    const maxIndex = files
      .map((v) => new RegExp(`rum-backup-${date}-(\\d+?)$`).exec(v))
      .filter(<T extends unknown>(v: T | null): v is T => !!v)
      .map((v) => Number(v[1]))
      .reduce((p, c) => Math.max(p, c), 0);
    const newPath = path.join(selectedPath, `rum-backup-${date}-${maxIndex + 1}`);
    runInAction(() => {
      state.backupPath = newPath;
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      submit();
    }
  };

  const handleClose = action(() => {
    state.open = false;
    props.rs();
  });

  React.useEffect(reaction(
    () => state.mode,
    action(() => {
      state.backupPath = '';
      state.storagePath = '';
    }),
  ), []);

  return (
    <Dialog
      disableEscapeKeyDown
      open={state.open}
      transitionDuration={{
        enter: 300,
      }}
      onClose={(...args) => {
        if (state.loading || args[1] === 'backdropClick') {
          return;
        }
        handleClose();
      }}
    >
      <div className="w-100 bg-white rounded-12 text-center px-8 pt-12 pb-8">
        <div>
          {/* {state.step === STEP.SELECT_MODE && (<>
            <div className="text-16 font-bold text-gray-4a">
              {lang.backup.selectExportMode}
            </div>
            <div className="mt-4">
              <FormControl>
                <RadioGroup
                  defaultValue="native"
                  value={state.mode}
                  onChange={action((_, v) => { state.mode = v; })}
                >
                  <FormControlLabel
                    className="select-none"
                    disabled={!process.env.IS_ELECTRON}
                    value="native"
                    control={<Radio />}
                    label={lang.backup.exportForRumApp}
                  />
                  <FormControlLabel
                    className="select-none"
                    value="wasm"
                    control={<Radio />}
                    label={lang.backup.exportForWasm}
                  />
                </RadioGroup>
              </FormControl>

              <Button
                className="rounded min-w-[160px] h-10 mt-4"
                onClick={submit}
              >
                {lang.backup.yes}
              </Button>
            </div>
          </>)} */}
          {state.step === STEP.SELECT_SOURCE && (<>
            <div className="text-16 font-bold text-gray-4a">{ lang.backup.selectFolder }</div>
            <div className="mt-6 text-gray-9b tracking-wide leading-loose">
              <div className="text-centent">{ lang.backup.storagePathLoginTip2 }</div>
            </div>
            <div>
              {!state.storagePath && (
                <Button
                  className="mt-12 rounded min-w-[160px] h-10"
                  onClick={handleSelectRumDir}
                >
                  {lang.backup.selectFolder}
                </Button>
              )}

              {state.storagePath && (<>
                <div className="flex mt-6">
                  <div className="text-left p-2 pl-3 border border-gray-200 text-gray-500 bg-gray-100 text-12 truncate flex-1 border-r-0">
                    <Tooltip placement="top" title={state.storagePath} arrow>
                      <div className="tracking-wide">
                        {formatPath(state.storagePath, { truncateLength: 30 })}
                      </div>
                    </Tooltip>
                  </div>
                  <Button
                    className="rounded-r-12 opacity-60"
                    size="small"
                    onClick={handleSelectRumDir}
                  >
                    {lang.backup.edit}
                  </Button>
                </div>
                <div className="mt-6">
                  <Button
                    className="rounded min-w-[160px] h-10"
                    isDoing={state.loading}
                    isDone={state.done}
                    onClick={submit}
                  >
                    {lang.operations.confirm}
                  </Button>
                </div>
              </>)}
            </div>
          </>)}
          {state.step === STEP.SELECT_TARGET && (<>
            <div className="text-16 font-bold text-gray-4a">{ lang.backup.selectFolder }</div>
            <div className="mt-6 text-gray-9b tracking-wide leading-loose">
              {lang.backup.selectFolderToSaveKeyBackupFile}
            </div>
            <div className="mt-6 mb-4 pt-[2px]">
              {!state.backupPath && !state.backupPathHandle && (
                <Button
                  className="rounded min-w-[160px] h-10"
                  onClick={handleSelectDir}
                >
                  {lang.backup.selectFolder}
                </Button>
              )}

              {!!state.backupPath && (<>
                <div className="flex">
                  <div className="text-left p-2 pl-3 border border-gray-200 text-gray-500 bg-gray-100 text-12 truncate flex-1 border-r-0">
                    <Tooltip placement="top" title={state.backupPath} arrow>
                      <div className="tracking-wide">
                        {formatPath(state.backupPath, { truncateLength: 19 })}
                      </div>
                    </Tooltip>
                  </div>
                  <Button
                    className="rounded-r-12 opacity-60"
                    size="small"
                    onClick={handleSelectDir}
                  >
                    {lang.backup.edit}
                  </Button>
                </div>
                <div className="mt-6">
                  <Button
                    className="rounded min-w-[160px] h-10"
                    isDoing={state.loading}
                    isDone={state.done}
                    onClick={submit}
                  >
                    {lang.operations.confirm}
                  </Button>
                </div>
              </>)}

              {!!state.backupPathHandle && (<>
                <div className="flex">
                  <div className="text-left p-2 pl-3 border border-gray-200 text-gray-500 bg-gray-100 text-12 truncate flex-1 border-r-0">
                    <div className="tracking-wide">
                      {state.backupPathHandle.name}
                    </div>
                  </div>
                  <Button
                    className="rounded-r-12 opacity-60"
                    size="small"
                    onClick={handleSelectDir}
                  >
                    {lang.backup.edit}
                  </Button>
                </div>
                <div className="mt-6">
                  <Button
                    className="rounded min-w-[160px] h-10"
                    isDoing={state.loading}
                    isDone={state.done}
                    onClick={submit}
                  >
                    {lang.operations.confirm}
                  </Button>
                </div>
              </>)}
            </div>
          </>)}
          {state.step === STEP.INPUT_PASSWORD && (<>
            <div className="text-16 font-bold text-gray-4a">{ lang.backup.enterPassword }</div>
            <div className="mt-6">
              <PasswordInput
                className="w-full"
                placeholder={lang.backup.password}
                size="small"
                value={state.password}
                onChange={action((e) => { state.password = e.target.value; })}
                onKeyDown={handleInputKeyDown}
                margin="dense"
                variant="outlined"
                type="password"
              />
            </div>
            <div className="mt-6 mb-4 pt-[2px]">
              <Button
                className="rounded min-w-[160px] h-10"
                disabled={!state.password}
                isDoing={state.loading}
                isDone={state.done}
                onClick={submit}
              >
                {lang.operations.confirm}
              </Button>
            </div>
          </>)}
          {state.step > 1 && (
            <div className="my-4">
              <span
                className={classNames(
                  'mt-5 text-link-blue text-14',
                  state.loading ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
                onClick={() => {
                  if (state.loading) {
                    return;
                  }
                  runInAction(() => {
                    state.step = state.step > 1 ? state.step - 1 : 1;
                  });
                }}
              >
                {lang.backup.backOneStep}
              </span>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
});
