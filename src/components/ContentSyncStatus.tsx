import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Tooltip } from '@mui/material';
import { RiCheckDoubleFill, RiCheckLine } from 'react-icons/ri';

interface Props {
  className?: string
  synced?: boolean
}

export const ContentSyncStatus = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    type: (props.synced ? 'none' : 'pending') as 'none' | 'pending' | 'check',
  }));

  useEffect(() => {
    if (state.type === 'pending' && props.synced) {
      runInAction(() => {
        state.type = 'check';
      });
      setTimeout(action(() => {
        state.type = 'none';
      }), 3000);
    }
  }, [props.synced]);

  if (state.type === 'none') { return null; }
  return (
    <Tooltip title={state.type === 'pending' ? '同步中' : '已同步'}>
      <div className={props.className}>
        {state.type === 'pending' && (
          <RiCheckLine className="text-18 text-black/50" />
        )}
        {state.type === 'check' && (
          <RiCheckDoubleFill className="text-18 text-green-400" />
        )}
      </div>
    </Tooltip>
  );
});
