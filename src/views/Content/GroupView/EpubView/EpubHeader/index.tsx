import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { utils } from 'rum-sdk-browser';
import { HiOutlineShare } from 'react-icons/hi';
import { BiCommentDetail } from 'react-icons/bi';
// import LockIcon from 'boxicons/svg/regular/bx-lock.svg?fill-icon';
import DetailIcon from 'boxicons/svg/regular/bx-detail.svg?fill-icon';
import UploadIcon from 'boxicons/svg/regular/bx-upload.svg?fill';
import { Badge, Button, IconButton, Tooltip } from '@mui/material';

import { GroupMenu } from '~/views/Content/GroupView/GroupMenu';
import { GroupIcon, UploadBookButton, UserAvatar, UserName } from '~/components';
import { shareGroup, groupInfo, uploadBook, notificationModal } from '~/standaloneModals';
import { lang } from '~/utils';
import { bookService, linkGroupService, nodeService } from '~/service';

import { LinkGroupMenu } from '../../LinkGroupMenu';
import { EpubInfoPopup } from './EpubInfoPopup';
import { NotificationsNone } from '@mui/icons-material';

export const EpubHeader = observer(() => {
  const state = useLocalObservable(() => ({
    epubInfoPopup: false,
    get group() {
      return nodeService.state.groupMap[this.currentGroupId] ?? null;
    },
    get linkGroup() {
      return nodeService.state.groupMap[this.currentLinkGroupId] ?? null;
    },
    get currentGroupId() {
      return bookService.state.current.groupId;
    },
    get currentLinkGroupId() {
      return bookService.state.current.linkGroupId;
    },
    get currentBookId() {
      return bookService.state.current.bookId;
    },
    get unreadCount() {
      return linkGroupService.state.notification.unreadCountMap[this.currentLinkGroupId] ?? 0;
    },
    get peersCount() {
      const groups = nodeService.state.network.groups ?? [];
      const item = groups.find((v) => v.GroupId === this.currentGroupId);
      return item?.Peers?.length ?? 0;
    },
    get linkGroupPeersCount() {
      const groups = nodeService.state.network.groups ?? [];
      const item = groups.find((v) => v.GroupId === this.currentLinkGroupId);
      return item?.Peers?.length ?? 0;
    },
    get linkGroupUserAddress() {
      const pubkey = this.linkGroup?.user_pubkey;
      if (!pubkey) { return ''; }
      return utils.pubkeyToAddress(pubkey);
    },
    get isPublicGroup() {
      const groupId = this.currentGroupId;
      const postAuthType = nodeService.state.trxAuthTypeMap.get(groupId)?.POST;
      return postAuthType === 'FOLLOW_ALW_LIST';
    },
  }));
  const infoPopupButton = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (state.currentGroupId) {
      nodeService.updateTrxAuthType(state.currentGroupId);
    }
  }, []);

  return (
    <div className="flex-col flex-none border-b border-gray-200 bg-white">
      {!!state.group && (
        <div className="flex items-center justify-between pr-6 h-[65px] flex-none">
          <div className="flex self-stretch items-center flex-1 w-0">
            <GroupIcon
              className="mx-4 rounded-lg shadow-1"
              width={48}
              height={48}
              fontSize={20}
              groupId={bookService.state.current.groupId}
            />
            <div className="font-bold text-18 tracking-wide truncate max-w-[220px]">
              <span
                className="text-gray-1e cursor-pointer"
                onClick={() => groupInfo({ groupId: state.group!.group_id })}
              >
                {state.group.group_name}
              </span>
            </div>

            {/* {!state.isPublicGroup && (
              <LockIcon className="text-20 text-bright-orange ml-6" />
            )} */}

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

            {/* <Button className="ml-6">
              {lang.epub.setAsPublic}
            </Button> */}
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
      )}

      {!!state.linkGroup && (
        <div className="flex items-center h-[40px] flex-none border-t">
          <BiCommentDetail className="ml-7 mr-4 -mb-1 text-24 text-black/60" />
          <div className="text-16 tracking-wider truncate max-w-[220px]">
            <span
              className="text-black/70 cursor-pointer"
              onClick={() => groupInfo({ groupId: state.linkGroup!.group_id })}
            >
              {state.linkGroup.group_name}
            </span>
          </div>

          {!!state.linkGroupPeersCount && (
            <Tooltip
              enterDelay={500}
              enterNextDelay={500}
              placement="bottom"
              title={lang.node.connectedPeerCountTip(state.linkGroupPeersCount)}
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
                {' '}{lang.node.connectedPeerCount(state.linkGroupPeersCount)}
              </div>
            </Tooltip>
          )}

          <div className="flex-1" />

          <div className="flex items-stretch gap-x-2 pr-6">
            <IconButton onClick={() => notificationModal({ groupId: state.currentLinkGroupId })}>
              <Badge
                classes={{ badge: 'bg-red-500 text-white font-bold' }}
                badgeContent={state.unreadCount}
              >
                <NotificationsNone />
              </Badge>
            </IconButton>
            <Button
              className="flex items-center gap-2 rounded-none px-3 normal-case normal-font"
              variant="text"
              size="small"
              onClick={() => linkGroupService.post.list({
                groupId: state.linkGroup!.group_id,
                order: 'time',
                userAddress: state.linkGroupUserAddress,
              })}
            >
              <UserAvatar
                groupId={state.linkGroup.group_id}
                userAddress={state.linkGroupUserAddress}
                size={28}
                showSyncing
              />
              <UserName
                className="text-black/70 font-bold"
                groupId={state.linkGroup.group_id}
                userAddress={state.linkGroupUserAddress}
              />
            </Button>

            <LinkGroupMenu
              className="py-2 text-24 text-gray-70"
              group={state.linkGroup}
            />
          </div>
        </div>
      )}
    </div>
  );
});
