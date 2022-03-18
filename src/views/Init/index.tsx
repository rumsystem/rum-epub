import React from 'react';
import { observer } from 'mobx-react-lite';
import { CircularProgress } from '@mui/material';

import { nodeService } from '~/service/node';
import { quorumService } from '~/service/quorum';
import { dialogService } from '~/service/dialog';
import { lang } from '~/utils/lang';
import { dbService } from '~/service/db';

interface Props {
  onInitSuccess: () => unknown
}

export const Init = observer((props: Props) => {
  const startNode = async () => {
    await quorumService.updateStatus();
    if (quorumService.state.up) {
      return 'success';
    }

    const result = await quorumService.up();
    if (result === 'failed') {
      const result = await dialogService.open({
        content: lang.failToStartNode,
        confirm: lang.reload,
        hideCancel: true,
      });

      if (result === 'confirm') {
        await quorumService.down();
        window.location.reload();
      }
    }

    return result;
  };

  const start = async () => {
    const r = await startNode();
    if (r === 'failed') {
      return;
    }
    nodeService.startPolling(true);
    await Promise.all([
      nodeService.updateGroups(true),
      nodeService.updateNodeInfo().then(() => {
        if (nodeService.state.nodeInfo.node_publickey) {
          dbService.initDb(nodeService.state.nodeInfo.node_publickey);
        }
      }),
    ]);
    props.onInitSuccess();
  };

  React.useEffect(() => {
    start();
  }, []);

  return (
    <div className="flex flex-center h-full">
      <div className="flex-col flex-center ">
        <CircularProgress
          className="text-gray-d8"
          size={28}
        />
        <span className="text-gray-9c mt-4 text-16">
          正在启动
        </span>
      </div>
    </div>
  );
});
