import React from 'react';
import classNames from 'classnames';

import { ThemeRoot } from '~/utils/theme';
import { preloadAvatars } from '~/utils/avatars';
import { loadInspect } from '~/utils/inspect';

import { initService } from '~/service';
import { ConfirmDialogContainer } from '~/service/dialog/ConfirmDialogContainer';
import { LoadingContainer } from '~/service/loading/LoadingContainer';
import { TooltipContainer } from '~/service/tooltip/TooltipContainer';

import { TitleBar } from './TitleBar';
import { Init } from './Init';
import Content from './Content';

export const App = () => {
  const [inited, setInited] = React.useState(false);

  React.useEffect(() => {
    preloadAvatars();
    loadInspect();
    const dispose = initService();
    return dispose;
  }, []);

  return (
    <ThemeRoot>
      <div className="flex flex-col h-screen w-screen">
        {inited && (
          <TitleBar />
        )}

        <div
          className={classNames(
            'flex-1 h-0 relative',
          )}
        >
          {!inited && (
            <Init
              onInitSuccess={() => {
                setInited(true);
              }}
            />
          )}
          {inited && (
            <Content />
          )}
        </div>
      </div>

      <ConfirmDialogContainer />
      <LoadingContainer />
      <TooltipContainer />
    </ThemeRoot>
  );
};
