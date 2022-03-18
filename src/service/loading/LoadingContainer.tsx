import React from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { CircularProgress } from '@mui/material';
import { loadingService } from './index';

export const LoadingContainer = observer(() => {
  const state = useLocalObservable(() => ({
    get loadings() {
      const l = [...loadingService.state.loadings];
      l.sort((a, b) => a.closeTime - b.closeTime);
      return l;
    },
    get reason() {
      return this.loadings.at(0)?.reason ?? '';
    },
    get open() {
      return !!this.loadings.length;
    },
  }));

  if (!state.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 select-none">
      <div
        className={classNames(
          'flex-col flex-center overflow-hidden w-[200px] p-8 bg-black/85',
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl',
        )}
      >
        <CircularProgress size={60} className="text-white" />
        <div className="text-white text-16 mt-8 break-all">
          {state.reason}
        </div>
      </div>
    </div>
  );
});
