import React from 'react';
import { Loading } from '~/components/Loading';
import { Tooltip } from '@mui/material';
import { lang } from '~/utils';

interface IProps {
  url: string
  size?: number
  className?: string
  loading?: boolean
  onClick?: () => void
}

export const Avatar = (props: IProps) => {
  const size = props.size || 42;
  return (
    <div
      className={props.className}
      style={{
        height: size,
        width: size,
      }}
      onClick={props.onClick}
    >
      <div className="relative w-full h-full">
        <img
          className="rounded-full border-shadow overflow-hidden w-full h-full"
          src={props.url}
          style={{ border: '2px solid hsl(212, 12%, 90%)' }}
          alt="avatar"
        />
        {props.loading && (
          <Tooltip
            placement={size > 50 ? 'top' : 'bottom'}
            title={lang.profile.syncingProfile}
            arrow
          >
            <div className="absolute top-[-4px] right-[-7px] rounded-full bg-black bg-opacity-70 flex flex-center p-[3px] z-10">
              <Loading size={size > 50 ? 16 : 12} color="#fff" />
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
