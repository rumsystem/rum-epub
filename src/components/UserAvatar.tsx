import React from 'react';
import { observer } from 'mobx-react-lite';
import { linkGroupService } from '~/service';
import base64 from '~/utils/base64';
import defaultAvatar from '~/assets/avatar/default_avatar.png';
import { CircularProgress, Tooltip } from '@mui/material';
import { lang } from '~/utils';

interface IProps {
  className?: string
  groupId?: string
  userAddress?: string
  url?: string
  size?: number
  onClick?: () => void
  showSyncing?: boolean
}

export const UserAvatar = observer((props: IProps) => {
  const size = props.size || 42;

  React.useEffect(() => {
    const profile = linkGroupService.state.profile.mapByAddress.get(`${props.groupId}-${props.userAddress}`);
    if (profile === undefined && props.groupId && props.userAddress) {
      linkGroupService.profile.get(props.groupId, props.userAddress);
    }
  }, []);

  const profile = linkGroupService.state.profile.mapByAddress.get(`${props.groupId}-${props.userAddress}`);
  const profileAvatar = profile?.avatar;
  const syncing = profile?.status === 'pending';
  const url = props.url || (profileAvatar ? base64.getUrl(profileAvatar) : '') || defaultAvatar;

  return (
    <div
      className={props.className}
      style={{ height: `${size}px`, width: `${size}px` }}
      onClick={props.onClick}
    >
      <div className="relative w-full h-full">
        <img
          className="rounded-full border-shadow overflow-hidden w-full h-full"
          src={url}
          style={{ border: '2px solid hsl(212, 12%, 90%)' }}
          alt="avatar"
        />
        {props.showSyncing && syncing && (
          <Tooltip
            placement={size > 50 ? 'top' : 'bottom'}
            title={lang.profile.syncingProfile}
            arrow
          >
            <div className="absolute top-[-4px] right-[-7px] rounded-full bg-black bg-opacity-70 flex flex-center p-[3px] z-10">
              <CircularProgress className="text-white" size={size > 50 ? 16 : 12} />
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
});
