import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';

import { ThemeRoot } from '~/utils/theme';
import { loadInspect } from '~/utils/inspect';

import { initService, quorumService } from '~/service';
import { ConfirmDialogContainer } from '~/service/dialog/ConfirmDialogContainer';
import { LoadingContainer } from '~/service/loading/LoadingContainer';
import { TooltipContainer } from '~/service/tooltip/TooltipContainer';
import { UpdateContainer } from '~/service/update/UpdateContainer';

import { TitleBar } from './TitleBar';
import { Init } from './Init';
import Content from './Content';

export const App = observer(() => {
  const state = useLocalObservable(() => ({
    inited: false,
  }));

  React.useEffect(action(() => {
    const disposeInspect = loadInspect();
    const dispose = initService();
    state.inited = true;
    return () => {
      dispose();
      disposeInspect();
    };
  }), []);

  if (!state.inited) {
    return null;
  }

  return (
    <ThemeRoot>
      <div className="flex flex-col h-screen w-screen">
        <TitleBar />

        <div
          className={classNames(
            'flex-1 h-0 relative',
          )}
        >
          {!quorumService.state.serviceInited && (
            <Init
              onInitSuccess={action(() => {
                quorumService.state.serviceInited = true;
              })}
            />
          )}
          {quorumService.state.serviceInited && (
            <Content />
          )}
        </div>
      </div>

      <ConfirmDialogContainer />
      <LoadingContainer />
      <TooltipContainer />
      <UpdateContainer />
    </ThemeRoot>
  );
});
