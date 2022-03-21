import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { FaTimesCircle, FaCheckCircle } from 'react-icons/fa';
import { tooltipService } from './index';

export const TooltipContainer = observer(() => {
  if (!tooltipService.state.items.length) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 select-none pointer-events-none"
      style={{
        zIndex: 2000,
      }}
    >
      {tooltipService.state.items.map((v) => (
        <div
          className={classNames(
            'flex-col flex-center overflow-hidden w-[180px] p-8 bg-black/85',
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl',
          )}
          key={v.id}
        >
          <div className="text-white text-42">
            {v.type === 'error' ? (
              <FaTimesCircle />
            ) : (
              <FaCheckCircle />
            )}
          </div>
          <div className="text-white text-16 mt-8 break-all">
            {v.content}
          </div>
        </div>
      ))}
    </div>);
});
