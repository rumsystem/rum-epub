import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { HiOutlineShare } from 'react-icons/hi';
// import { GoSync } from 'react-icons/go';
import LockIcon from 'boxicons/svg/regular/bx-lock.svg?fill-icon';
import DetailIcon from 'boxicons/svg/regular/bx-detail.svg?fill-icon';
import UploadIcon from 'boxicons/svg/regular/bx-upload.svg?fill';
import { Button, Tooltip } from '@mui/material';

import { GroupMenu } from '~/views/Content/GroupView/GroupMenu';
import { GroupIcon, UploadBookButton } from '~/components';

import { shareGroup } from '~/standaloneModals/shareGroup';
import { groupInfo } from '~/standaloneModals/groupInfo';

import { lang } from '~/utils';
import { bookService, nodeService } from '~/service';

import { EpubInfoPopup } from './EpubInfoPopup';
import { uploadBook } from '~/standaloneModals';

export const EpubHeader = observer(() => {
  const state = useLocalObservable(() => ({
    epubInfoPopup: false,
    get group() {
      return nodeService.state.groupMap[this.currentGroupId] ?? null;
    },
    get currentGroupId() {
      return bookService.state.current.groupId;
    },
    get currentBookId() {
      return bookService.state.current.bookId;
    },
    get peersCount() {
      const groups = nodeService.state.network.groups ?? [];
      const item = groups.find((v) => v.GroupId === this.currentGroupId);
      return item?.Peers?.length ?? 0;
    },
    get isPublicGroup() {
      const groupId = this.currentGroupId;
      const postAuthType = nodeService.state.trxAuthTypeMap.get(groupId)?.POST;
      return postAuthType === 'FOLLOW_ALW_LIST';
    },
  }));
  const infoPopupButton = React.useRef<HTMLDivElement>(null);

  const handleOpenGroupInfo = () => {
    if (state.group) {
      groupInfo({ groupId: state.group.group_id });
    }
  };

  React.useEffect(() => {
    nodeService.updateTrxAuthType(state.currentGroupId);
  }, []);

  if (!state.group) {
    return null;
  }

  return (
    <div className="flex items-center justify-between flex-none border-b border-gray-200 h-[70px] pr-6 bg-white">
      <div className="flex self-stretch items-center flex-1 w-0">
        <GroupIcon
          className="mx-4 rounded-lg shadow-1"
          width={52}
          height={52}
          fontSize={20}
          groupId={bookService.state.current.groupId}
        />
        <div className="font-bold text-18 tracking-wider truncate max-w-[220px]">
          <span
            className="text-gray-1e cursor-pointer"
            onClick={() => handleOpenGroupInfo()}
          >
            {state.group.group_name}
          </span>
          <div className="mt-[2px] text-11 transform flex items-center opacity-90">
            {/* TODO: group status */}
            {/* {state.group.group_status === GroupStatus.SYNCING && (
              <span className="text-gray-9c leading-relaxed">
                {lang.group.syncing}
              </span>
            )}
            {state.group.group_status === GroupStatus.IDLE && (
              <span className="text-gray-9c leading-relaxed">
                {lang.group.synced}
              </span>
            )}

            {state.group.group_status === GroupStatus.SYNC_FAILED && (
              <div className="flex items-center px-3 rounded-full bg-red-400 text-opacity-90 text-white text-12 font-bold">
                {lang.group.syncFailed}
              </div>
            )} */}

            {/* TODO: group sync */}
            {/* <Tooltip
              enterDelay={800}
              enterNextDelay={800}
              placement="bottom"
              title={state.group.group_status === GroupStatus.SYNCING ? lang.group.syncingContentTip : lang.group.clickToSync}
              arrow
            >
              <div
                className="ml-1 cursor-pointer transform scale-90 opacity-40"
                onClick={() => nodeService.syncGroup(state.group!.group_id)}
              >
                <GoSync
                  className={classNames(
                    'text-18',
                    state.group.group_status === GroupStatus.SYNCING && 'animate-spin',
                  )}
                />
              </div>
            </Tooltip> */}
          </div>
        </div>

        {!state.isPublicGroup && (
          <LockIcon className="text-20 text-bright-orange ml-6" />
        )}

        <UploadBookButton>
          {(p) => {
            if (p.hasUploadAtLeastOneBook || !p.hasWritePermission) { return null; }
            return (
              <Tooltip title={p.hasWritePermission ? lang.epubUpload.uploadBook : lang.epubUpload.uploadBookNoPermission}>
                <div className="ml-8">
                  <Button
                    className="relative overflow-hidden"
                    onClick={() => uploadBook({ groupId: state.currentGroupId })}
                    disabled={!p.hasWritePermission}
                  >
                    <div className="flex flex-center gap-x-2 relative z-10">
                      <UploadIcon />
                      <span>{lang.epubUpload.uploadBook}</span>
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
            );
          }}
        </UploadBookButton>

        <Button className="ml-6">
          {lang.epub.setAsPublic}
        </Button>
      </div>

      <div className="flex items-center gap-x-6">
        {!!state.peersCount && (
          <Tooltip
            enterDelay={500}
            enterNextDelay={500}
            placement="bottom"
            title={lang.node.connectedPeerCountTip(state.peersCount)}
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
              {' '}{lang.node.connectedPeerCount(state.peersCount)}
            </div>
          </Tooltip>
        )}

        <div className="flex items-center">
          <div
            className="flex flex-center text-link-blue cursor-pointer text-16 opacity-80"
            onClick={() => shareGroup(state.group!.group_id)}
          >
            <HiOutlineShare className="text-18 mr-[6px]" />
            {lang.group.share}
          </div>
        </div>

        <div className="flex items-center">
          <div
            className="flex flex-center text-link-blue cursor-pointer text-16 opacity-80"
            onClick={action(() => { state.epubInfoPopup = true; })}
            ref={infoPopupButton}
          >
            <DetailIcon className="text-18 mr-[6px]" />
            {lang.epub.bookDetail}
          </div>
          {!!state.currentBookId && (
            <EpubInfoPopup
              open={state.epubInfoPopup}
              onClose={action(() => { state.epubInfoPopup = false; })}
              anchorEl={infoPopupButton.current}
              groupId={state.currentGroupId}
              bookId={state.currentBookId}
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
          group={state.group}
        />
      </div>
    </div>
  );
});
