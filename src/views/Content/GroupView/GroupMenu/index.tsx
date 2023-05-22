import { useRef } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { FiMoreHorizontal, FiDelete } from 'react-icons/fi';
import { MdInfoOutline } from 'react-icons/md';
import { Menu, MenuItem } from '@mui/material';
import { EditOutlined, Link } from '@mui/icons-material';
import UploadIcon from 'boxicons/svg/regular/bx-upload.svg?fill-icon';

import IconSeednetManage from '~/assets/icon_seednet_manage.svg';
import { IGroup } from '~/apis';
import { lang } from '~/utils';
import { nodeService, dialogService, loadingService, tooltipService, bookService } from '~/service';
import { UploadBookButton } from '~/components';
import {
  editEpubCover,
  uploadBook,
  manageGroup,
  editEpubMetadata,
  groupInfo,
  groupLink,
} from '~/standaloneModals';

interface Props {
  group: IGroup
  className?: string
}

export const GroupMenu = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,
    showMutedListModal: false,

    get currentBookId() {
      return bookService.state.current.bookId;
    },
  }));
  const isGroupOwner = props.group.user_pubkey === props.group.owner_pubkey;
  const linkGroupId = nodeService.state.groupLink[props.group.group_id];
  const linkGroup = nodeService.state.groups.find((v) => v.group_id === linkGroupId);

  const menuButtonRef = useRef<HTMLDivElement>(null);

  const handleMenuClick = action(() => {
    state.open = true;
  });

  const handleMenuClose = action(() => {
    state.open = false;
  });

  const handleOpenGroupInfoModal = () => {
    handleMenuClose();
    groupInfo({ groupId: props.group.group_id });
  };

  const handleOpenGroupLinkModal = () => {
    handleMenuClose();
    groupLink({ groupId: props.group.group_id });
  };

  const handleCancelGroupLink = async () => {
    handleMenuClose();
    const result = await dialogService.open({
      content: lang.linkGroup.unlinkTip,
    });
    if (result === 'cancel') {
      return;
    }
    if (bookService.state.current.linkGroupId) {
      bookService.openBook({ groupId: props.group.group_id });
    }
    runInAction(() => {
      delete nodeService.state.groupLink[props.group.group_id];
    });
    tooltipService.show({
      content: lang.linkGroup.unlinked,
    });
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
    confirmText += lang.group.confirmToExit;
    const result = await dialogService.open({
      content: confirmText,
      danger: true,
      confirmTestId: 'exit-group-dialog-confirm-button',
    });
    if (result === 'cancel') {
      return;
    }

    const loading = loadingService.add(lang.group.exitingGroup);

    nodeService.leaveGroup(props.group.group_id).then(
      () => {
        tooltipService.show({
          content: lang.group.exited,
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
    manageGroup({ groudId: props.group.group_id });
    handleMenuClose();
  };

  const handleEditMetadata = () => {
    editEpubMetadata({
      groupId: bookService.state.current.groupId,
      bookId: bookService.state.current.bookId,
    });
    handleMenuClose();
  };

  const handleEditCover = () => {
    editEpubCover({
      groupId: bookService.state.current.groupId,
      bookId: bookService.state.current.bookId,
    });
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
      <MenuItem onClick={handleOpenGroupInfoModal}>
        <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
          <div className="flex items-center w-7 flex-none">
            <MdInfoOutline className="text-18" />
          </div>
          <span className="font-bold text-14">{lang.group.info}</span>
        </div>
      </MenuItem>
      {!linkGroup && (
        <MenuItem onClick={handleOpenGroupLinkModal}>
          <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
            <div className="flex items-center w-7 flex-none">
              <Link className="text-18" />
            </div>
            <span className="font-bold text-14">{lang.group.linkGroup}</span>
          </div>
        </MenuItem>
      )}
      {!!linkGroup && (
        <MenuItem onClick={handleCancelGroupLink}>
          <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
            <div className="flex items-center w-7 flex-none">
              <Link className="text-18" />
            </div>
            <span className="font-bold text-14">{lang.group.unLinkGroup}</span>
          </div>
        </MenuItem>
      )}
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
              <img className="text-16" src={IconSeednetManage} />
            </span>
            <span className="font-bold text-14">{lang.group.manageGroup}</span>
          </div>
        </MenuItem>
      )}
      {isGroupOwner && (
        <UploadBookButton>
          {() => (
            <MenuItem onClick={() => { uploadBook({ groupId: props.group.group_id }); handleMenuClose(); }}>
              <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
                <span className="flex items-center w-7 flex-none">
                  <UploadIcon className="text-18" />
                </span>
                <span className="font-bold text-14">{lang.epubUpload.uploadBook}</span>
              </div>
            </MenuItem>
          )}
        </UploadBookButton>
      )}
      {isGroupOwner && !!state.currentBookId && (
        <MenuItem onClick={handleEditMetadata}>
          <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
            <span className="flex items-center w-7 flex-none">
              <EditOutlined className="text-18" />
            </span>
            <span className="font-bold text-14">{lang.epub.editMetadata}</span>
          </div>
        </MenuItem>
      )}
      {isGroupOwner && !!state.currentBookId && (
        <MenuItem onClick={handleEditCover}>
          <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
            <span className="flex items-center w-7 flex-none">
              <EditOutlined className="text-18" />
            </span>
            <span className="font-bold text-14">{lang.epub.editCover}</span>
          </div>
        </MenuItem>
      )}
      <MenuItem
        onClick={() => handleLeaveGroup()}
        data-test-id="group-menu-exit-group-button"
      >
        <div className="flex items-center text-red-400 leading-none pl-1 py-2">
          <div className="flex items-center w-7 flex-none">
            <FiDelete className="text-16" />
          </div>
          <span className="font-bold text-14">{lang.group.exitGroup}</span>
        </div>
      </MenuItem>
    </Menu>
  </>);
});
