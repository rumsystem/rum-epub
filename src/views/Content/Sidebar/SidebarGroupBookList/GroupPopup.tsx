import React from 'react';
import { observer } from 'mobx-react-lite';
import { FiDelete } from 'react-icons/fi';
import { MdInfoOutline } from 'react-icons/md';
import { ClickAwayListener, ClickAwayListenerProps } from '@mui/material';

import { IGroup } from '~/apis';
import { groupInfo } from '~/standaloneModals/groupInfo';

import { lang, sleep } from '~/utils';
import { dialogService, loadingService, nodeService, tooltipService } from '~/service';
import { GROUP_CONFIG_KEY } from '~/utils/constant';

interface Props {
  group: IGroup
  onClose: () => void
  onClickAway: ClickAwayListenerProps['onClickAway']
}

export const GroupPopup = observer((props: Props) => {
  const handleLeaveGroup = async () => {
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

  // const isOwner = props.group.user_pubkey === props.group.owner_pubkey;
  const groupDesc = (nodeService.state.configMap.get(props.group.group_id)?.[GROUP_CONFIG_KEY.GROUP_DESC] ?? '') as string;

  return (
    <ClickAwayListener
      onClickAway={props.onClickAway}
      mouseEvent="onMouseDown"
    >
      <div className="shadow-3 w-[400px] border-black border text-white">
        <div className="flex items-center bg-black h-[50px] px-4">
          <div className="flex-1 text-16 truncate">
            {props.group.group_name}
          </div>
        </div>
        <div className="flex bg-white text-black">
          <div className="flex-1 p-4 max-h-[200px] overflow-y-auto">
            {groupDesc && (
              <div className="text-gray-9c text-12 pb-3 leading-normal">
                {groupDesc}
              </div>
            )}
            {/* <div className="flex items-center justify-center">
              <Avatar
                className="flex-none"
                size={44}
                url={state.profile?.avatar ?? ''}
              />
              <div className="text-14 flex-1 ml-3">
                <div className="text-14 flex items-center opacity-80">
                  <div className="truncate flex-1 w-0 mt-[2px]">
                    {state.profile?.name}
                  </div>
                  {!!state.profile?.mixinUID && (
                    <WalletIcon className="ml-2 flex-none" />
                  )}
                </div>
                {isOwner && (
                  <div className="text-gray-9c mt-[6px] text-12">
                    {[
                      isOwner && `[${lang.owner}]`,
                    ].filter(Boolean).join(' ')}
                  </div>
                )}
              </div>
            </div> */}
          </div>
          <div className="flex-none text-16 bg-gray-f2 py-3 select-none">
            <div
              className="flex items-center px-6 py-3 hover:bg-gray-ec cursor-pointer"
              onClick={async () => {
                props.onClose();
                await sleep(300);
                groupInfo(props.group);
              }}
            >
              <MdInfoOutline className="text-18 text-gray-600 opacity-50  mr-3" />
              <span>{lang.group.info}</span>
            </div>
            <div
              className="flex items-center px-6 py-3 hover:bg-gray-ec cursor-pointer"
              onClick={async () => {
                props.onClose();
                await sleep(300);
                handleLeaveGroup();
              }}
            >
              <FiDelete className="text-16 text-red-400 opacity-50 ml-px mr-3" />
              <span className="text-red-400 ml-px">{lang.group.exit}</span>
            </div>
          </div>
        </div>
      </div>
    </ClickAwayListener>
  );
});
