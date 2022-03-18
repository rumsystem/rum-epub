import React from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';

import { HiOutlineShare } from 'react-icons/hi';
import { GoSync } from 'react-icons/go';

import { Tooltip } from '@mui/material';

import GroupMenu from '~/components/GroupMenu';
import GroupIcon from '~/components/GroupIcon';
import { shareGroup } from '~/standaloneModals/shareGroup';
import { lang } from '~/utils/lang';
import ago from '~/utils/ago';
import { GroupStatus } from '~/apis';

import { nodeService } from '~/service/node';

import { EpubUploadButton } from './EpubUploadButton';

export const EpubHeader = observer(() => {
  const state = useLocalObservable(() => ({
    get peersCount() {
      const groups = nodeService.state.network.groups ?? [];
      const item = groups.find((v) => v.GroupId === nodeService.state.activeGroupId);
      return item?.Peers?.length ?? 0;
    },
  }));
  const group = nodeService.state.activeGroup;

  if (!group) {
    return null;
  }

  const syncing = group.group_status === GroupStatus.SYNCING;

  return (
    <div className="flex items-center justify-between flex-none border-b border-gray-200 h-[70px] pr-6">
      <div className="flex self-stretch items-center flex-1 w-0">
        <GroupIcon
          className="rounded-6 mr-3 ml-6"
          width={44}
          height={44}
          fontSize={24}
          group={group}
        />
        <div className="font-bold text-black text-18 tracking-wider truncate cursor-pointer max-w-[220px]">
          <span
            className="opacity-90"
            // onClick={() => openGroupInfoModal()}
          >
            {group.group_name}
          </span>
          <div className="mt-[2px] text-11 transform flex items-center opacity-90">
            <span className="text-gray-9c">
              {ago(group.last_updated)}更新
            </span>
            <Tooltip
              enterDelay={800}
              enterNextDelay={800}
              placement="bottom"
              title={syncing ? lang.syncingContentTip : lang.clickToSync}
              arrow
            >
              <div
                className="ml-1 cursor-pointer transform scale-90 opacity-40"
              >
                <GoSync className={classNames('text-18', syncing && 'animate-spin')} />
              </div>
            </Tooltip>
          </div>
        </div>

        <EpubUploadButton className="ml-8" />
      </div>

      <div className="flex items-center gap-x-4">
        {!!state.peersCount && (
          <Tooltip
            enterDelay={500}
            enterNextDelay={500}
            placement="bottom"
            title={lang.connectedPeerCountTip(state.peersCount)}
            arrow
          >
            <div className="flex items-center py-1 px-3 rounded-full text-emerald-400 text-12 leading-none ml-3 font-bold tracking-wide opacity-85 mt-1-px select-none">
              <div
                className="bg-emerald-300 rounded-full mr-2"
                style={{ width: 8, height: 8 }}
              />{' '}
              {lang.connectedPeerCount(state.peersCount)}
            </div>
          </Tooltip>
        )}

        <div className="flex items-center">
          <div
            className="flex flex-center text-link-blue cursor-pointer text-16 opacity-80"
            onClick={() => shareGroup(group.group_id)}
          >
            <HiOutlineShare className="text-16 mr-[6px]" />
            {lang.share}
          </div>
        </div>

        <GroupMenu
          className="py-2 text-24 text-gray-70"
          group={group}
        />
      </div>
    </div>
  );
});
