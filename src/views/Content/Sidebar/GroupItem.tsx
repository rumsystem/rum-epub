import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Popover } from '@mui/material';

import { GroupIcon } from '~/components';
import { IGroup } from '~/apis';
import { nodeService } from '~/service';
import { splitByHighlightText } from '~/utils';
import { GroupPopup } from './GroupPopup';

interface GroupItemProps {
  group: IGroup
  highlight: string
}

export default observer((props: GroupItemProps) => {
  const state = useLocalObservable(() => ({
    groupPopupOpen: false,

    get active() {
      return nodeService.state.activeGroupId === props.group.group_id;
    },
  }));
  const boxRef = React.useRef<HTMLDivElement>(null);

  const isOwner = props.group.owner_pubkey === props.group.user_pubkey;

  const handleClick = () => {
    nodeService.changeActiveGroup(props.group.group_id);
  };

  const handleClose = action(() => {
    state.groupPopupOpen = false;
  });

  return (<>
    <div
      className="cursor-pointer"
      onContextMenu={action((e) => {
        e.preventDefault();
        state.groupPopupOpen = true;
      })}
      onClick={handleClick}
      key={props.group.group_id}
      ref={boxRef}
      data-test-id="sidebar-group-item"
    >
      <div
        className={classNames(
          'flex justify-between items-center leading-none h-[44px] px-3',
          'text-14 relative pointer-events-none',
          state.active && 'bg-black text-white',
          !state.active && 'bg-white text-black',
        )}
      >
        <div
          className={classNames(
            'w-[3px] h-full flex flex-col items-stretch absolute left-0',
            !state.active && 'py-px',
          )}
        >
          {isOwner && <div className="flex-1 bg-[#ff931e]" />}
        </div>
        <div className="flex items-center">
          <GroupIcon
            className="rounded-6 mr-2 w-6"
            width={24}
            height={24}
            fontSize={14}
            group={props.group}
            colorClassName={state.active ? 'text-gray-33' : 'text-white'}
          />
          <div className="py-1 font-medium truncate max-w-36 text-14">
            {!props.highlight && props.group.group_name}
            {!!props.highlight && splitByHighlightText(props.group.group_name, props.highlight).map((v, i) => (
              <span className={classNames(v.type === 'highlight' && 'text-highlight-green')} key={i}>
                {v.text}
              </span>
            ))}
          </div>
        </div>

        {/* <div className="absolute top-0 right-4 h-full flex items-center">
          <Badge
            className="transform mr-1"
            classes={{
              badge: classNames(
                'bg-transparent tracking-tighter',
                state.active && 'text-gray-af',
                !state.active && 'text-gray-9c',
              ),
            }}
            badgeContent={unreadCount}
            invisible={!unreadCount}
            variant="standard"
            max={9999}
          />
          <Badge
            className="transform scale-90 mr-2"
            classes={{
              badge: 'bg-red-500',
            }}
            invisible={!showNotificationBadge}
            variant="dot"
          />
        </div> */}
      </div>
    </div>

    <Popover
      classes={{
        root: 'pointer-events-none',
        paper: 'pointer-events-auto',
      }}
      open={state.groupPopupOpen}
      onClose={handleClose}
      anchorEl={boxRef.current}
      anchorOrigin={{
        horizontal: 'right',
        vertical: 'center',
      }}
      transformOrigin={{
        horizontal: 'left',
        vertical: 'center',
      }}
    >
      <GroupPopup
        group={props.group}
        onClickAway={handleClose}
        onClose={handleClose}
      />
    </Popover>
  </>);
});
