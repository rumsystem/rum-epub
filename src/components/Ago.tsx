import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Tooltip } from '@mui/material';
import { ago } from '~/utils';

interface Props {
  className?: string
  timestamp: number
}

export const Ago = (props: Props) => {
  const [value, setValue] = useState(ago(props.timestamp));

  useEffect(() => {
    let timeoutId = 0;
    const update = () => {
      const interval = Date.now() - props.timestamp > 1000 * 60
        ? 1000 * 60
        : 5000;
      timeoutId = window.setTimeout(() => {
        setValue(ago(props.timestamp));
        update();
      }, interval);
    };

    update();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const tooltipTitle = useMemo(() => format(props.timestamp, 'yyyy-MM-dd HH:mm:ss'), [props.timestamp]);

  return (
    <Tooltip
      enterDelay={200}
      title={tooltipTitle}
      disableInteractive
    >
      <span className={props.className}>
        {value}
      </span>
    </Tooltip>
  );
};
