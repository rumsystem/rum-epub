import React from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { HiOutlineShare } from 'react-icons/hi';
import { GoSync } from 'react-icons/go';
import LockIcon from 'boxicons/svg/regular/bx-lock.svg?fill-icon';
import DetailIcon from 'boxicons/svg/regular/bx-detail.svg?fill-icon';
import UploadIcon from 'boxicons/svg/regular/bx-upload.svg?fill';
import { Button, Tooltip } from '@mui/material';

import { GroupMenu } from '~/components/GroupMenu';
import { BookCoverImg, BookCoverImgTooltip } from '~/components';

import { shareGroup } from '~/standaloneModals/shareGroup';
import { groupInfo } from '~/standaloneModals/groupInfo';

import { GroupStatus } from '~/apis';
import { lang } from '~/utils';
import { EpubItem, nodeService } from '~/service';

import { EpubUploadButton } from './EpubUploadButton';
import { action } from 'mobx';
import { EpubInfoPopup } from './EpubInfoPopup';
import { uploadEpub, UploadEpubButton } from '~/standaloneModals/uploadEpub';

interface Props {
  book?: EpubItem | null
}

export const EpubHeader = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    epubInfoPopup: false,
    get peersCount() {
      const groups = nodeService.state.network.groups ?? [];
      const item = groups.find((v) => v.GroupId === nodeService.state.activeGroupId);
      return item?.Peers?.length ?? 0;
    },
    get isPublicGroup() {
      const groupId = nodeService.state.activeGroupId;
      const postAuthType = nodeService.state.trxAuthTypeMap.get(groupId)?.POST;
      return postAuthType === 'FOLLOW_ALW_LIST';
    },
  }));
  const infoPopupButton = React.useRef<HTMLDivElement>(null);

  const handleOpenGroupInfo = () => {
    if (nodeService.state.activeGroup) {
      groupInfo(nodeService.state.activeGroup);
    }
  };

  const group = nodeService.state.activeGroup;

  React.useEffect(() => {
    nodeService.updateTrxAuthType(nodeService.state.activeGroupId);
  }, []);

  if (!group) {
    return null;
  }

  return (
    <div className="flex items-center justify-between flex-none border-b border-gray-200 h-[70px] pr-6">
      <div className="flex self-stretch items-center flex-1 w-0">
        <div className="mx-4 flex-none h-full">
          <BookCoverImgTooltip book={props.book} placement="bottom">
            <div className="h-full">
              <BookCoverImg className="h-full w-auto" book={props.book} />
            </div>
          </BookCoverImgTooltip>
        </div>
        {/* <GroupIcon
          className="rounded-6 mr-3 ml-6"
          width={44}
          height={44}
          fontSize={24}
          group={group}
        /> */}
        <div className="font-bold text-18 tracking-wider truncate max-w-[220px]">
          <span
            className="text-gray-1e cursor-pointer"
            onClick={() => handleOpenGroupInfo()}
          >
            {group.group_name}
          </span>
          <div className="mt-[2px] text-11 transform flex items-center opacity-90">
            {group.group_status === GroupStatus.SYNCING && (
              <span className="text-gray-9c leading-relaxed">
                {lang.syncing}
              </span>
            )}
            {group.group_status === GroupStatus.IDLE && (
              <span className="text-gray-9c leading-relaxed">
                {lang.synced}
              </span>
            )}

            {group.group_status === GroupStatus.SYNC_FAILED && (
              <div className="flex items-center px-3 rounded-full bg-red-400 text-opacity-90 text-white text-12 font-bold">
                {lang.syncFailed}
              </div>
            )}

            <Tooltip
              enterDelay={800}
              enterNextDelay={800}
              placement="bottom"
              title={group.group_status === GroupStatus.SYNCING ? lang.syncingContentTip : lang.clickToSync}
              arrow
            >
              <div
                className="ml-1 cursor-pointer transform scale-90 opacity-40"
                onClick={() => nodeService.syncGroup(group.group_id)}
              >
                <GoSync
                  className={classNames(
                    'text-18',
                    group.group_status === GroupStatus.SYNCING && 'animate-spin',
                  )}
                />
              </div>
            </Tooltip>
          </div>
        </div>

        {!state.isPublicGroup && (
          <LockIcon className="text-20 text-bright-orange ml-6" />
        )}

        <UploadEpubButton>
          {(p) => (
            <Tooltip title={p.hasWritePermission ? '上传书籍' : '你没有权限在这个种子网络上传内容'}>
              <div className="ml-8">
                <Button
                  className="relative overflow-hidden"
                  onClick={uploadEpub}
                  disabled={!p.hasWritePermission}
                >
                  <div className="flex flex-center gap-x-2 relative z-10">
                    <UploadIcon />
                    <span>
                      上传书籍
                    </span>
                  </div>

                  <div
                    className={classNames(
                      'absolute left-0 top-0 h-full bg-white/30 duration-300',
                      p.hasUploadAtLeastOneBook && 'hidden',
                    )}
                    style={{ width: p.progressPercentage }}
                  />
                </Button>
              </div>
            </Tooltip>
          )}
        </UploadEpubButton>


        {/* <EpubUploadButton className="ml-8" /> */}

        <Button className="ml-6">
          设为公开，允许发现
        </Button>
      </div>

      <div className="flex items-center gap-x-6">
        {!!state.peersCount && (
          <Tooltip
            enterDelay={500}
            enterNextDelay={500}
            placement="bottom"
            title={lang.connectedPeerCountTip(state.peersCount)}
            arrow
          >
            <div
              className={classNames(
                'flex items-center py-1 px-3 ml-3 rounded-full opacity-85',
                'text-12 text-emerald-400 leading-none font-bold tracking-wide select-none',
              )}
            >
              <div
                className="bg-emerald-300 rounded-full mr-2"
                style={{ width: 8, height: 8 }}
              />
              {' '}{lang.connectedPeerCount(state.peersCount)}
            </div>
          </Tooltip>
        )}

        <div className="flex items-center">
          <div
            className="flex flex-center text-link-blue cursor-pointer text-16 opacity-80"
            onClick={() => shareGroup(group.group_id)}
          >
            <HiOutlineShare className="text-18 mr-[6px]" />
            {lang.share}
          </div>
        </div>

        <div className="flex items-center">
          <div
            className="flex flex-center text-link-blue cursor-pointer text-16 opacity-80"
            onClick={action(() => { state.epubInfoPopup = true; })}
            ref={infoPopupButton}
          >
            <DetailIcon className="text-18 mr-[6px]" />
            内容详情
          </div>
          {!!props.book && (
            <EpubInfoPopup
              open={state.epubInfoPopup}
              onClose={action(() => { state.epubInfoPopup = false; })}
              anchorEl={infoPopupButton.current}
              groupId={nodeService.state.activeGroupId}
              bookTrx={props.book.trxId}
              transformOrigin={{
                horizontal: 'center',
                vertical: 'top',
              }}
              anchorOrigin={{
                horizontal: 'center',
                vertical: 'bottom',
              }}
            />
          )}
        </div>

        <GroupMenu
          className="py-2 text-24 text-gray-70"
          group={group}
        />
      </div>
    </div>
  );
});
