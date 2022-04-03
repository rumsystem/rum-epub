import React from 'react';
import { observer } from 'mobx-react-lite';
import { nodeService } from '~/service';
import Welcome from './Welcome';
import Sidebar from './Sidebar';
import { GroupView } from './GroupView';

export default observer(() => (
  <div className="flex bg-white items-stretch h-full">
    {nodeService.state.groups.length === 0 && (
      <div className="flex flex-1 flex-center">
        <Welcome />
      </div>
    )}

    {nodeService.state.groups.length !== 0 && (
      <Sidebar className="select-none flex-none z-20" />
    )}

    {!!nodeService.state.activeGroup && (
      <GroupView className="flex-1 w-0" />
    )}
  </div>
));
