import { useRef } from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Menu, MenuItem } from '@mui/material';
import { FiMoreHorizontal, FiDelete } from 'react-icons/fi';
import { MdInfoOutline } from 'react-icons/md';
import { HiOutlineShare } from 'react-icons/hi';

import IconSeednetManage from '~/assets/icon_seednet_manage.svg';
import { IGroup } from '~/apis';
import { lang } from '~/utils';
import { nodeService, dialogService, loadingService, tooltipService, bookService } from '~/service';
import { manageGroup, groupInfo, shareGroup } from '~/standaloneModals';

interface Props {
  group: IGroup
  className?: string
}

export const LinkGroupMenu = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,
    showMutedListModal: false,

    get currentBookId() {
      return bookService.state.current.bookId;
    },
  }));
  const isGroupOwner = props.group.user_pubkey === props.group.owner_pubkey;

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

  const handleShareGroup = () => {
    handleMenuClose();
    shareGroup(props.group.group_id);
  };

  const handleLeaveGroup = async () => {
    handleMenuClose();
    const result = await dialogService.open({
      content: lang.group.confirmToExit,
      danger: true,
    });
    if (result === 'cancel') { return; }

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

  return (<>
    <div
      className={props.className}
      onClick={handleMenuClick}
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
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      autoFocus={false}
    >
      <MenuItem onClick={handleOpenGroupInfoModal}>
        <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
          <div className="flex items-center w-7 flex-none">
            <MdInfoOutline className="text-18" />
          </div>
          <span className="font-bold text-14">{lang.group.trxInfo}</span>
        </div>
      </MenuItem>
      <MenuItem onClick={handleShareGroup}>
        <div className="flex items-center text-gray-600 leading-none pl-1 py-2">
          <div className="flex items-center w-7 flex-none">
            <HiOutlineShare className="text-18" />
          </div>
          <span className="font-bold text-14">{lang.group.share}</span>
        </div>
      </MenuItem>
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
      <MenuItem onClick={handleLeaveGroup}>
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
