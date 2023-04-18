import React from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';

import { ThemeRoot } from '~/utils/theme';
import { loadInspect } from '~/utils/inspect';

import { initService, serviceViewContainers } from '~/service';

import { TitleBar } from './TitleBar';
import { Init } from './Init';
import Content from './Content';
import { ModalView } from '~/standaloneModals/view';

export const App = observer(() => {
  const state = useLocalObservable(() => ({
    serviceInited: false,
    quorumInited: false,
  }));

  React.useEffect(action(() => {
    const disposeInspect = loadInspect();
    const dispose = initService();
    state.serviceInited = true;
    return () => {
      dispose();
      disposeInspect();
    };
  }), []);

  if (!state.serviceInited) {
    return null;
  }

  return (
    <ThemeRoot>
      <div className="flex flex-col h-screen w-screen">
        <TitleBar />

        <div className="flex-1 h-0 relative">
          {!state.quorumInited && (
            <Init onInitSuccess={action(() => { state.quorumInited = true; })} />
          )}
          {state.quorumInited && (
            <Content />
          )}
        </div>
      </div>

      {serviceViewContainers.map((C, i) => (
        <C key={i} />
      ))}
      <ModalView />
    </ThemeRoot>
  );
});
