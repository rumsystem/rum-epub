import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { FaTimesCircle, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
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
      {tooltipService.state.items.map((v) => {
        const type = v.type ?? 'default';
        return (
          <div
            className={classNames(
              'flex-col flex-center overflow-hidden w-[180px] p-8 bg-black/85',
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl',
            )}
            key={v.id}
          >
            <div className="text-white text-42">
              {type === 'default' && <FaCheckCircle />}
              {type === 'error' && <FaTimesCircle />}
              {type === 'warning' && <FaExclamationCircle />}
            </div>
            <div className="text-white text-16 mt-8 break-all">
              {v.content}
            </div>
          </div>
        );
      })}
    </div>);
});
