import React from 'react';
import { observer } from 'mobx-react-lite';
import { CircularProgress } from '@mui/material';
import { updateService } from '~/service';

export const UpdateContainer = observer(() => {
  if (updateService.state.progress) {
    const percent = updateService.state.progress?.percent ?? 0;
    return (
      <div
        className="fixed flex flex-center left-7 bottom-5 bg-black text-white px-2 py-1"
        style={{
          zIndex: 1300,
        }}
      >
        <CircularProgress
          className="text-white mr-1"
          size={12}
          variant="determinate"
          value={percent}
        />
        正在下载{' '}
        {Math.ceil(percent)}%
      </div>
    );
  }

  if (updateService.state.manuallyChecking && !updateService.state.progress) {
    return (
      <div
        className="fixed flex flex-center left-7 bottom-5 bg-black text-white px-2 py-1"
        style={{
          zIndex: 1300,
        }}
      >
        <CircularProgress
          className="text-white mr-1"
          size={12}
        />
        正在检查更新
      </div>
    );
  }

  return null;
});
