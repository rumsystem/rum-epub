import { createRoot } from 'react-dom/client';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { app } from '@electron/remote';
import { Tooltip } from '@mui/material';
import { Dialog, Button, MiddleTruncate } from '~/components';

import { lang, setClipboard } from '~/utils';
import { ThemeRoot } from '~/utils/theme';
import { dialogService, nodeService, NODE_TYPE, quorumService, tooltipService } from '~/service';

import NetworkInfoModal from './NetworkInfoModal';
import NodeParamsModal from './NodeParamsModal';

export const nodeInfoModal = async () => new Promise<void>((rs) => {
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
        <MyNodeInfo
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
  rs: () => unknown
}

const MyNodeInfo = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    showNodeParamsModal: false,
    showNetworkInfoModal: false,

    get port() {
      return quorumService.state.port;
    },
  }));

  const handleClose = action(() => {
    state.open = false;
    props.rs();
  });

  const handleExitNode = async () => {
    const result = await dialogService.open({
      content: lang.node.confirmToExitNode,
      confirm: lang.operations.confirm,
      danger: true,
    });

    if (result === 'cancel') {
      return;
    }

    nodeService.state.nodeInfoConfig = {
      ...nodeService.state.nodeInfoConfig,
      type: NODE_TYPE.UNKNOWN,
      internalNode: null,
      externalNode: null,
      historyExtenralNodes: nodeService.state.nodeInfoConfig?.historyExtenralNodes ?? [],
    };

    runInAction(() => {
      tooltipService.show({
        content: lang.node.exitingNode,
        type: 'default',
        timeout: 10000,
      });
    });

    await nodeService.saveNodeConfig();
    await quorumService.internal.down();

    window.location.reload();
  };

  return (
    <Dialog
      open={state.open}
      onClose={handleClose}
    >
      <div className="bg-white rounded-0 p-8">
        <div className="w-70">
          <div className="text-18 font-bold text-gray-700 text-center">
            {lang.node.nodeInfo}
          </div>
          <div className="mt-6">
            <div className="text-gray-500 font-bold opacity-90">ID</div>
            <div className="flex mt-1">
              <div className="p-2 pl-3 border border-gray-200 text-gray-500 bg-gray-100 text-12 truncate flex-1 rounded-l-0 border-r-0">
                <MiddleTruncate
                  string={nodeService.state.nodeInfo.node_publickey}
                  length={13}
                />
              </div>
              <Button
                className="rounded-r-0"
                size="small"
                onClick={() => {
                  setClipboard(nodeService.state.nodeInfo.node_publickey);
                  tooltipService.show({
                    content: lang.copied,
                  });
                }}
              >
                {lang.copy}
              </Button>
            </div>
          </div>

          {nodeService.state.nodeInfoConfig?.type === NODE_TYPE.INTERNAL && (
            <div className="mt-6">
              <div className="text-gray-500 font-bold opacity-90">{lang.node.storageDir}</div>
              <div className="mt-2 text-12 text-gray-500 bg-gray-100 border border-gray-200 rounded-0 py-2 px-4">
                <Tooltip
                  placement="top"
                  title={nodeService.state.nodeInfoConfig.internalNode?.dir ?? ''}
                  arrow
                >
                  <div className="tracking-wide truncate">
                    {nodeService.state.nodeInfoConfig.internalNode?.dir}
                  </div>
                </Tooltip>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="text-gray-500 font-bold opacity-90">{lang.node.detail}</div>
            <div className="mt-2 flex items-center justify-center text-12 text-gray-500 bg-gray-100 border border-gray-200 rounded-0 py-2 px-4">
              <Tooltip
                placement="top"
                title={`quorum latest commit: ${nodeService.state.nodeInfo.node_version.split(' - ')[1]}`}
                arrow
              >
                <div>{lang.node.version} {app.getVersion()}</div>
              </Tooltip>
              <div className="px-4">|</div>

              <div
                className="flex items-center hover:font-bold cursor-pointer"
                onClick={action(() => { state.showNodeParamsModal = true; })}
              >
                {lang.node.nodeParams}
              </div>
              <div className="px-4">|</div>

              <div
                className="flex items-center hover:font-bold cursor-pointer"
                onClick={action(() => { state.showNetworkInfoModal = true; })}
              >
                {lang.node.networkStatus}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button fullWidth color="red" outline onClick={handleExitNode}>
              {lang.node.exitNode}
            </Button>
          </div>
        </div>
        <NetworkInfoModal
          open={state.showNetworkInfoModal}
          onClose={action(() => { state.showNetworkInfoModal = false; })}
        />
        <NodeParamsModal
          open={state.showNodeParamsModal}
          onClose={action(() => { state.showNodeParamsModal = false; })}
        />
      </div>
    </Dialog>
  );
});
