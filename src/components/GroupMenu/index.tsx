import React from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { FiMoreHorizontal, FiDelete } from 'react-icons/fi';
import { MdInfoOutline } from 'react-icons/md';
import { Menu, MenuItem } from '@mui/material';
import { EditOutlined } from '@mui/icons-material';

import { IGroup } from '~/apis';
import { manageGroup, groupInfo, editEpubMetadata } from '~/standaloneModals';
import { lang } from '~/utils';
import { nodeService, dialogService, loadingService, tooltipService } from '~/service';

import IconSeednetManage from '~/assets/icon_seednet_manage.svg';

interface Props {
  group: IGroup
  className?: string
}

export const GroupMenu = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,
    showMutedListModal: false,
  }));
  const isGroupOwner = props.group.user_pubkey === props.group.owner_pubkey;

  const menuButtonRef = React.useRef<HTMLDivElement>(null);

  const handleMenuClick = action(() => {
    state.open = true;
  });

  const handleMenuClose = action(() => {
    state.open = false;
  });

  const openGroupInfoModal = () => {
    handleMenuClose();
    groupInfo(props.group);
  };

  // const openMutedListModal = () => {
  //   handleMenuClose();
  //   state.showMutedListModal = true;
  // };

  const handleLeaveGroup = async () => {
    handleMenuClose();
    let confirmText = '';
    // if (latestStatus.producerCount === 1 && isGroupOwner) {
    //   confirmText = lang.singleProducerConfirm;
    // }
    confirmText += lang.confirmToExit;
    const result = await dialogService.open({
      content: confirmText,
      danger: true,
      confirmTestId: 'exit-group-dialog-confirm-button',
    });
    if (result === 'cancel') {
      return;
    }

    const loading = loadingService.add('正在退出群组');

    nodeService.leaveGroup(props.group.group_id).then(
      () => {
        tooltipService.show({
          content: lang.exited,
        });
      },
      (err) => {
        console.error(err);
        tooltipService.show({
          content: lang.somethingWrong,
          type: 'error',
        });
      },
    ).finally(() => {
      loading.close();
    });
  };

  const handleManageGroup = () => {
    manageGroup(nodeService.state.activeGroupId);
    handleMenuClose();
  };

  const handleEditMetadata = () => {
    editEpubMetadata();
    handleMenuClose();
  };

  return (<>
    <div
      className={props.className}
      onClick={handleMenuClick}
      data-test-id="group-menu-button"
      ref={menuButtonRef}
    >
      <div className="px-2">
        <FiMoreHorizontal className="cursor-pointer" />
      </div>
    </div>
    <Menu
      anchorEl={menuButtonRef.current}
      open={state.open}
      onClose={handleMenuClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      autoFocus={false}
    >
      <MenuItem onClick={openGroupInfoModal}>
        <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
          <div className="flex items-center w-7 flex-none">
            <MdInfoOutline className="text-18 opacity-50" />
          </div>
          <span className="font-bold text-14">{lang.info}</span>
        </div>
      </MenuItem>
      {/* {activeGroupMutedPublishers.length > 0 && (
          <MenuItem onClick={() => openMutedListModal()}>
            <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
              <span className="flex items-center mr-3">
                <HiOutlineBan className="text-16 opacity-50" />
              </span>
              <span className="font-bold">{lang.mutedList}</span>
            </div>
          </MenuItem>
        )} */}
      {isGroupOwner && (
        <MenuItem onClick={handleManageGroup}>
          <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
            <span className="flex items-center w-7 flex-none">
              <img className="text-16 opacity-50" src={IconSeednetManage} />
            </span>
            <span className="font-bold text-14">{lang.manageGroup}</span>
          </div>
        </MenuItem>
      )}
      {isGroupOwner && (
        <MenuItem onClick={handleEditMetadata}>
          <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
            <span className="flex items-center w-7 flex-none">
              <EditOutlined className="text-18" />
            </span>
            <span className="font-bold text-14">编辑书籍元信息</span>
          </div>
        </MenuItem>
      )}
      <MenuItem
        onClick={() => handleLeaveGroup()}
        data-test-id="group-menu-exit-group-button"
      >
        <div className="flex items-center text-red-400 leading-none pl-1 py-2">
          <div className="flex items-center w-7 flex-none">
            <FiDelete className="text-16 opacity-50" />
          </div>
          <span className="font-bold text-14">{lang.exitGroup}</span>
        </div>
      </MenuItem>
    </Menu>
  </>);
});
