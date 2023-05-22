import React from 'react';
import { observer } from 'mobx-react-lite';
import { linkGroupService } from '~/service';

interface IProps {
  className?: string
  groupId?: string
  userAddress?: string
  size?: number
  onClick?: () => void
}

export const UserName = observer((props: IProps) => {
  React.useEffect(() => {
    const profile = linkGroupService.state.profile.mapByAddress.get(`${props.groupId}-${props.userAddress}`);
    if (profile === undefined && props.groupId && props.userAddress) {
      linkGroupService.profile.get(props.groupId, props.userAddress);
    }
  }, []);

  const profile = linkGroupService.state.profile.mapByAddress.get(`${props.groupId}-${props.userAddress}`);
  const name = profile?.name ?? props.userAddress?.slice(0, 11) ?? '';

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <span className={props.className}>{name}</span>;
});
