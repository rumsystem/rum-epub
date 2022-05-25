
import React from 'react';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import { Button, Checkbox, CircularProgress, FormControlLabel, IconButton, InputBase, Tooltip } from '@mui/material';
import { ArrowBack, ChevronRight, Delete, Visibility, VisibilityOff } from '@mui/icons-material';

import IconImport from '~/assets/icon_import.svg';
import IconExport from '~/assets/icon_export.svg';
import rumBgImg from '~/assets/rum_barrel_bg.png';
import {
  nodeService,
  quorumService,
  dbService,
  NODE_TYPE,
  tooltipService,
  NodeInfoStore,
  initServiceAfterDB,
} from '~/service';
import { lang } from '~/utils';
import { selectRumFolder } from './helper';

interface Props {
  onInitSuccess: () => unknown
}

interface ExternalItem {
  host: string
  port: string
  jwt: string
  cert: string
}

const steps = [
  'init',
  'select',
  'select-internal-new',
  'select-internal-exist',
  'external-select',
  'external-input',
  'starting',
  'failed',
] as const;
type Steps = typeof steps[number];

export const Init = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    step: 'init' as Steps,

    internal: {
      folder: '',
      password: '',
      passwordConfirm: '',
      passwordVisibile: false,
      savePassword: false,
    },

    external: {
      host: '',
      port: '',
      jwt: '',
      cert: '',
    },

    startingTooLong: false,
    startFailed: null as null | 'internal-password' | 'internal-unknown' | 'external-unknown',

    get nodeConfig() {
      return nodeService.state.nodeInfoConfig!;
    },
    get internalNodeFormComplete() {
      return !!state.internal.folder && !!state.internal.password;
    },
    get externalNodeFormComplete() {
      return !!state.external.port && !Number.isNaN(Number(state.external.port));
    },
  }));

  const resetInternalForm = action(() => {
    state.internal = {
      folder: '',
      password: '',
      passwordConfirm: '',
      passwordVisibile: false,
      savePassword: false,
    };
  });

  const resetExternalForm = action(() => {
    state.external = {
      host: '',
      port: '',
      jwt: '',
      cert: '',
    };
  });

  const startInternalNode = async () => {
    runInAction(() => { state.step = 'starting'; });
    await quorumService.internal.updateStatus();
    if (quorumService.state.up) {
      return 'success';
    }

    runInAction(() => {
      state.nodeConfig.type = NODE_TYPE.INTERNAL;
      state.nodeConfig.internalNode = {
        dir: state.internal.folder,
        password: state.internal.savePassword ? state.internal.password : '',
      };
    });

    nodeService.saveNodeConfig();

    await quorumService.internal.up({
      storagePath: state.internal.folder,
      password: state.internal.password,
    });
  };

  const connectExternalNode = (config: NodeInfoStore) => {
    runInAction(() => { state.step = 'starting'; });
    const externalConfig = config.externalNode;
    const port = Number(externalConfig?.port ?? 0);
    return quorumService.external.up({
      cert: externalConfig?.cert ?? '',
      host: externalConfig?.host ?? '127.0.0.1',
      jwt: externalConfig?.jwt ?? '',
      port: Number.isNaN(port) ? 0 : port,
    });
  };

  const internalUpCheck = async () => {
    const result = await quorumService.internal.ping();
    pipe(
      result,
      E.match(
        action((e) => {
          state.step = 'failed';
          state.startFailed = e === 'password'
            ? 'internal-password'
            : 'internal-unknown';
        }),
        () => postStartInit(),
      ),
    );
  };

  const externalUpCheck = async () => {
    const result = await quorumService.external.ping(30);
    pipe(
      result,
      E.matchW(
        action(() => {
          state.step = 'failed';
          state.startFailed = 'external-unknown';
        }),
        action(() => {
          const history = nodeService.state.nodeInfoConfig!.historyExtenralNodes;
          const item = {
            host: state.external.host,
            cert: state.external.cert,
            jwt: state.external.jwt,
            port: state.external.port,
          };
          const hasItem = history.some((v) => {
            const condition = [
              v.host === item.host,
              v.cert === item.cert,
              v.jwt === item.jwt,
              v.port === item.port,
            ];
            return condition.every(Boolean);
          });
          if (!hasItem) {
            history.push(item);
          }
          nodeService.state.nodeInfoConfig!.type = NODE_TYPE.EXTERNAL;
          nodeService.saveNodeConfig();
          postStartInit();
        }),
      ),
    );
  };

  const postStartInit = async () => {
    nodeService.startPolling(true);
    await Promise.all([
      nodeService.updateGroups(true),
      nodeService.updateNodeInfo().then(() => {
        if (nodeService.state.nodeInfo.node_publickey) {
          dbService.initDb(nodeService.state.nodeInfo.node_publickey);
          initServiceAfterDB();
        }
      }),
    ]);
    props.onInitSuccess();
  };

  const handleSelectFolder = async () => {
    const path = await selectRumFolder(state.step === 'select-internal-new' ? 'new' : 'exist');
    if (E.isLeft(path)) {
      if (path.left) {
        tooltipService.show({
          content: path.left,
          type: 'error',
        });
      }
      return;
    }
    runInAction(() => {
      state.internal.folder = path.right;
    });
  };

  const handleStartInternalNode = async () => {
    if (!state.internalNodeFormComplete) { return; }
    if (!nodeService.state.nodeInfoConfig) {
      await nodeService.loadNodeConfig();
    }
    await startInternalNode();
    await internalUpCheck();
  };

  const handleStartExternalNode = async () => {
    if (!state.externalNodeFormComplete) { return; }
    if (!nodeService.state.nodeInfoConfig) {
      await nodeService.loadNodeConfig();
    }
    nodeService.state.nodeInfoConfig!.externalNode = {
      host: state.external.host || '127.0.0.1',
      cert: state.external.cert,
      jwt: state.external.jwt,
      port: state.external.port,
    };
    nodeService.saveNodeConfig();
    await connectExternalNode(nodeService.state.nodeInfoConfig!);
    await externalUpCheck();
  };

  const handleSwitchToExternalInput = action((config?: ExternalItem) => {
    state.external = config ?? {
      host: '',
      port: '',
      jwt: '',
      cert: '',
    };
    state.step = 'external-input';
  });

  const handleSelectExternalConfig = action((item: any) => {
    state.external = { ...item };
    state.step = 'external-input';
  });

  const handleDeleteExternalHistoryItem = action((item: any) => {
    const config = nodeService.state.nodeInfoConfig;
    if (!config) { return; }
    const index = config.historyExtenralNodes.indexOf(item);
    if (index !== -1) {
      config.historyExtenralNodes.splice(index, 1);
    }
    nodeService.saveNodeConfig();
  });

  const init = async () => {
    await nodeService.loadNodeConfig();
    const config = nodeService.state.nodeInfoConfig!;
    await quorumService.internal.updateStatus();
    // check if internal node is already up
    if (quorumService.state.up) {
      internalUpCheck();
      return;
    }

    const canStartInternal = config.type === NODE_TYPE.INTERNAL
      && config.internalNode?.dir
      && config.internalNode?.password;
    const canStartExternal = config.type === NODE_TYPE.EXTERNAL
      && config.externalNode?.host
      && config.externalNode?.port;

    if (canStartInternal) {
      runInAction(() => {
        state.internal.password = config.internalNode?.password ?? '';
        state.internal.savePassword = true;
        state.internal.folder = config.internalNode?.dir ?? '';
      });
      await startInternalNode();
      await internalUpCheck();
      return;
    }

    if (canStartExternal) {
      await connectExternalNode(config);
      await externalUpCheck();
      return;
    }

    runInAction(() => {
      state.step = 'select';
    });
  };

  React.useEffect(() => {
    init();
  }, []);

  React.useEffect(() => {
    let timer = 0;
    return reaction(
      () => state.step,
      () => {
        if (state.step === 'starting') {
          timer = window.setTimeout(action(() => {
            state.startingTooLong = true;
          }), 10000);
        } else {
          window.clearTimeout(timer);
        }
      },
    );
  }, []);

  return (
    <div
      className="flex flex-center h-full bg-cover bg-center"
      style={{
        backgroundImage: `url(${rumBgImg})`,
      }}
    >
      {state.step === 'init' && (
        <div>
          <CircularProgress className="text-white opacity-50" />
        </div>
      )}
      {state.step === 'select' && (
        <div className="flex bg-black bg-opacity-80 text-white p-15">
          <div className="flex-col items-stretch pl-6 pr-18 py-8 w-[450px]">
            <div
              className="flex justify-between border-b border-gray-9c py-5 mt-4 cursor-pointer"
              onClick={action(() => { resetInternalForm(); state.step = 'select-internal-new'; })}
            >
              <div className="text-18 font-medium">
                创建节点
              </div>
              <div className="flex flex-center text-gray-9c text-16">
                第一次使用
                <ChevronRight />
              </div>
            </div>
            <div
              className="flex justify-between border-b border-gray-9c py-5 mt-4 cursor-pointer"
              onClick={action(() => { resetInternalForm(); state.step = 'select-internal-exist'; })}
            >
              <div className="text-18 font-medium">
                登录节点
              </div>
              <div className="flex flex-center text-gray-9c text-16">
                已经拥有节点
                <ChevronRight />
              </div>
            </div>
            <div
              className="flex justify-between border-b border-gray-9c py-5 mt-4 cursor-pointer"
              onClick={action(() => { resetExternalForm(); state.step = 'external-select'; })}
            >
              <div className="text-18 font-medium">
                外部节点
              </div>
              <div className="flex flex-center text-gray-9c text-16">
                连接到公开可访问的节点
                <ChevronRight />
              </div>
            </div>
          </div>
          <div className="flex-col gap-y-20 flex-center border-l border-gray-70 py-12 pl-16">
            <Button
              className="flex items-center gap-x-4 py-2 bg-transparent border border-solid border-white/80 rounded-none text-16"
            >
              <img src={IconImport} alt="" />
              节点导入
            </Button>
            <Button
              className="flex items-center gap-x-4 py-2 bg-transparent border border-solid border-white/80 rounded-none text-16"
            >
              <img src={IconExport} alt="" />
              节点导出
            </Button>
          </div>
        </div>
      )}
      {['select-internal-new', 'select-internal-exist'].includes(state.step) && (
        <div className="flex-col items-center relative bg-black bg-opacity-80 text-white p-15 w-[600px]">
          <IconButton
            className="absolute top-4 left-4 text-white"
            onClick={action(() => { state.step = 'select'; })}
          >
            <ArrowBack />
          </IconButton>
          <div className="text-20">
            {state.step === 'select-internal-new' && '创建节点'}
            {state.step === 'select-internal-exist' && '登录节点'}
          </div>
          <div className="mt-4">
            {state.step === 'select-internal-new' && (
              <div>
                请选择一个文件夹来储存节点数据
                这份数据只是属于你
                我们不会储存数据，也无法帮你找回
                请务必妥善保管
              </div>
            )}
            {state.step === 'select-internal-exist' && (
              <div>
                创建节点时您选择了一个文件夹
                里面保存了您的节点信息
                现在请重新选中该文件夹
                以登录该节点
              </div>
            )}
          </div>
          <div className="mt-4 flex-col items-center">
            {!!state.internal.folder && (
              <div className="flex mt-4">
                <Tooltip classes={{ tooltip: 'text-14' }} title={state.internal.folder} placement="top">
                  <InputBase
                    className="bg-white/20 text-white text-14 px-2 border border-gray-9c w-[240px]"
                    value={state.internal.folder}
                  />
                  {/* <div className="text-white w-[240px] border border-gray-9c p-2">
                    <div className="flex relative overflow-hidden">
                      <div className="whitespace-nowrap">
                        {state.folder}
                      </div>
                    </div>
                  </div> */}
                </Tooltip>
                <Button
                  className="rounded-none border border-solid border-l-0 border-gray-9c"
                  onClick={handleSelectFolder}
                >
                  编辑
                </Button>
              </div>
            )}
            {!state.internal.folder && (
              <Button
                className="mt-4 px-6 rounded-none"
                onClick={handleSelectFolder}
              >
                选择文件夹
              </Button>
            )}
          </div>
          <div className="flex-col items-center mt-8">
            <div className="text-16">
              {state.step === 'select-internal-new' && '创建密码'}
              {state.step === 'select-internal-exist' && '输入密码'}
            </div>

            <div className="flex">
              <InputBase
                className="mt-2 pl-2 py-1 bg-white/20 w-[220px] text-16"
                endAdornment={(
                  <IconButton
                    className="text-white mr-1"
                    size="small"
                    onClick={action(() => { state.internal.passwordVisibile = !state.internal.passwordVisibile; })}
                  >
                    {state.internal.passwordVisibile && (<VisibilityOff className="text-18" />)}
                    {!state.internal.passwordVisibile && (<Visibility className="text-18" />)}
                  </IconButton>
                )}
                type={state.internal.passwordVisibile ? 'text' : 'password'}
                value={state.internal.password}
                inputProps={{ className: 'text-white px-1' }}
                onChange={action((e) => { state.internal.password = e.target.value; })}
              />
            </div>

            <FormControlLabel
              className="mt-2"
              control={(
                <Checkbox
                  className="!text-white/70"
                  checked={state.internal.savePassword}
                  onChange={action((_, v) => { state.internal.savePassword = v; })}
                />
              )}
              label={<span className="text-14">记住密码</span>}
            />
          </div>

          <Button
            className={classNames(
              'mt-4 px-6 rounded-none',
              !state.internalNodeFormComplete && 'cursor-not-allowed',
            )}
            onClick={handleStartInternalNode}
          >
            {state.step === 'select-internal-new' && '创建节点'}
            {state.step === 'select-internal-exist' && '登录节点'}
          </Button>
        </div>
      )}
      {['external-select', 'external-input'].includes(state.step) && (
        <div className="flex-col items-center relative bg-black bg-opacity-80 text-white p-15 w-[600px]">
          <IconButton
            className="absolute top-4 left-4 text-white"
            onClick={action(() => { state.step = 'select'; })}
          >
            <ArrowBack />
          </IconButton>
          {state.step === 'external-select' && (
            <div className="flex-col items-center w-[240px]">
              <Button
                className="mt-4 px-6 rounded-none"
                onClick={() => handleSwitchToExternalInput()}
              >
                使用新的配置
              </Button>
              {!!nodeService.state.nodeInfoConfig?.historyExtenralNodes.length && (
                <div className="text-16 my-4 text-white/80">
                  或者选择最近使用过的配置
                </div>
              )}
              <div className="self-stretch">
                {(nodeService.state.nodeInfoConfig?.historyExtenralNodes ?? []).map((v, i) => (
                  <div
                    className="relative group px-3 py-2 border border-white/70 rounded cursor-pointer select-none bg-white/10"
                    key={i}
                    onClick={() => handleSelectExternalConfig(v)}
                  >
                    <div>
                      {v.host || '127.0.0.1'}:{v.port}
                    </div>
                    <div
                      className={classNames(
                        'w-6 h-6 flex-center hidden group-hover:flex',
                        'absolute right-2 top-1/2 -translate-y-1/2',
                        'bg-white/20 hover:bg-white/30  rounded-full',
                      )}
                      onClick={() => handleDeleteExternalHistoryItem(v)}
                    >
                      <Delete className="text-18" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {state.step === 'external-input' && (
            <div className="flex-col items-center">
              <div className="mt-4 flex-col items-center gap-y-4">
                {[
                  {
                    value: state.external.host,
                    onChange: action((e: React.ChangeEvent<HTMLInputElement>) => { state.external.host = e.target.value; }),
                    placeholder: '127.0.0.1 （可选）',
                  },
                  {
                    value: state.external.port,
                    onChange: action((e: React.ChangeEvent<HTMLInputElement>) => { state.external.port = e.target.value; }),
                    placeholder: '端口',
                  },
                  {
                    value: state.external.jwt,
                    onChange: action((e: React.ChangeEvent<HTMLInputElement>) => { state.external.jwt = e.target.value; }),
                    placeholder: 'jwt （可选）',
                  },
                  {
                    value: state.external.cert,
                    onChange: action((e: React.ChangeEvent<HTMLInputElement>) => { state.external.cert = e.target.value; }),
                    placeholder: 'TLS 证书',
                  },
                ].map((v, i) => (
                  <input
                    className="bg-white/20 text-white text-14 px-4 py-2 w-[240px] rounded focus:outline focus:outline-white/80 placeholder:text-white/30"
                    key={i}
                    value={v.value}
                    onChange={v.onChange}
                    placeholder={v.placeholder}
                  />
                ))}
              </div>

              <Button
                className={classNames(
                  'mt-8 px-6 rounded-none',
                  !state.externalNodeFormComplete && 'cursor-not-allowed',
                )}
                onClick={handleStartExternalNode}
              >
                连接外部节点
              </Button>
            </div>
          )}
        </div>
      )}
      {state.step === 'starting' && (
        <div className="flex-col flex-center">
          <CircularProgress
            className="text-gray-d8"
            size={28}
          />
          <span className="text-white/80 mt-4 text-16">
            正在启动...
            {state.startingTooLong && (
              <span>
                <br />
                启动太久，你也可以试试
                <span
                  className="text-black cursor-pointer"
                  onClick={() => {
                    window.location.reload();
                  }}
                >
                  重新加载
                </span>
                {lang.or}
                <span
                  className="text-black cursor-pointer"
                  onClick={async () => {
                    await nodeService.resetNodeConfig();
                    window.location.reload();
                  }}
                >
                  {lang.exitNode}
                </span>
              </span>
            )}
          </span>
        </div>
      )}

      {state.step === 'failed' && (
        <div className="flex-col flex-center text-white/80 mt-4 text-16">
          <div>
            {state.startFailed === 'internal-password' && '启动失败，密码错误...'}
            {state.startFailed === 'internal-unknown' && '启动失败...'}
            {state.startFailed === 'external-unknown' && '连接外部节点失败...'}
          </div>
          <div className="">
            你可以试试
            <span>
              <span
                className="text-white font-bold cursor-pointer"
                onClick={() => {
                  window.location.reload();
                }}
              >
                &nbsp;重新加载&nbsp;
              </span>
              {lang.or}
              <span
                className="text-white font-bold cursor-pointer"
                onClick={async () => {
                  await nodeService.resetNodeConfig();
                  window.location.reload();
                }}
              >
                &nbsp;{lang.exitNode}&nbsp;
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
