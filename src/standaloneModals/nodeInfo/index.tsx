import React from 'react';
import { createRoot } from 'react-dom/client';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import copy from 'copy-to-clipboard';
import { app } from '@electron/remote';
import { Tooltip } from '@mui/material';

import { Dialog, Button, MiddleTruncate } from '~/components';

import { lang } from '~/utils';
import { ThemeRoot } from '~/utils/theme';
import { nodeService, quorumService, tooltipService } from '~/service';

import NetworkInfoModal from './NetworkInfoModal';

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
    showNetworkInfoModal: false,

    get port() {
      return quorumService.state.port;
    },
  }));

  const handleClose = action(() => {
    state.open = false;
    props.rs();
  });

  return (
    <Dialog
      open={state.open}
      onClose={handleClose}
    >
      <div className="bg-white rounded-0 p-8">
        <div className="w-70">
          <div className="text-18 font-bold text-gray-700 text-center">
            {lang.nodeInfo}
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
                  copy(nodeService.state.nodeInfo.node_publickey);
                  tooltipService.show({
                    content: lang.copied,
                  });
                }}
              >
                {lang.copy}
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-gray-500 font-bold opacity-90">{lang.detail}</div>
            <div className="mt-2 flex items-center justify-center text-12 text-gray-500 bg-gray-100 border border-gray-200 rounded-0 py-2 px-4">
              <Tooltip
                placement="top"
                title={`quorum latest commit: ${
                  nodeService.state.nodeInfo.node_version.split(' - ')[1]
                }`}
                arrow
              >
                <div>{lang.version} {process.env.IS_ELECTRON ? app.getVersion() : ''}</div>
              </Tooltip>
              <div className="px-4">|</div>

              {/* {process.env.IS_ELECTRON && (<>
                <div
                  className="flex items-center hover:font-bold cursor-pointer"
                  onClick={() => { state.showNodeParamsModal = true; }}
                >
                  {lang.nodeParams}
                </div>
                <div className="px-4">|</div>
              </>)} */}

              <div
                className="flex items-center hover:font-bold cursor-pointer"
                onClick={() => { state.showNetworkInfoModal = true; }}
              >
                {lang.networkStatus}
              </div>
            </div>
          </div>

          {/* {process.env.IS_ELECTRON && (
            <div className="mt-8">
              <Button fullWidth color="red" outline onClick={handleExitNode}>
                {lang.exitNode}
              </Button>
            </div>
          )} */}
        </div>
        <NetworkInfoModal
          open={state.showNetworkInfoModal}
          onClose={() => { state.showNetworkInfoModal = false; }}
        />
      </div>
    </Dialog>
  );
});
