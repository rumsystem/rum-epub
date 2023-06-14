import { useMemo } from 'react';
import { utils } from 'rum-sdk-browser';
import { Menu, MenuItem } from '@mui/material';
import { MdInfoOutline } from 'react-icons/md';
import { DeleteOutline, Launch } from '@mui/icons-material';
import { trxInfo } from '~/standaloneModals/trxInfo';
import { postDetail } from '~/standaloneModals/postDetail';
import { Comment, Post, dialogService, linkGroupService, nodeService, tooltipService } from '~/service';
import { lang } from '~/utils';

interface Props {
  anchor?: HTMLElement | null
  object: Post | Comment
  open?: boolean
  onClose: () => unknown
  onDelete?: () => unknown
  hideOpenPostDetail?: boolean
}

export const ObjectMenu = (props: Props) => {
  const handleDeletePost = async () => {
    props.onClose();
    const result = await dialogService.open({
      content: lang.linkGroup.deletePostTip,
      confirm: lang.linkGroup.delete,
      danger: true,
    });
    if (result === 'confirm') {
      await linkGroupService.post.delete(props.object.groupId, props.object.id);
      tooltipService.show({
        content: lang.linkGroup.deleted,
      });
      props.onDelete?.();
    }
  };

  const group = nodeService.state.groups.find((v) => v.group_id === props.object.groupId);
  const myUserAddress = useMemo(() => {
    if (!group?.user_pubkey) { return ''; }
    try {
      return utils.pubkeyToAddress(group?.user_pubkey);
    } catch (e) {
      return '';
    }
  }, [group?.user_pubkey]);

  const postByMe = props.object.userAddress === myUserAddress;

  return (
    <Menu
      anchorEl={props.anchor}
      open={!!props.open}
      onClose={props.onClose}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { style: { margin: '10px 0 0 0' } } }}
    >
      {!('postId' in props.object) && !props.hideOpenPostDetail && (
        <MenuItem
          className="text-black/60 text-14 gap-3 font-bold py-2"
          onClick={() => {
            props.onClose();
            postDetail({ groupId: props.object.groupId, postId: props.object.id });
          }}
        >
          <Launch className="text-18 opacity-50 -mb-px" />
          {lang.linkGroup.openInDetail}
        </MenuItem>
      )}
      <MenuItem
        className="text-black/60 text-14 gap-3 font-bold py-2"
        onClick={() => {
          props.onClose();
          trxInfo({ groupId: props.object.groupId, trxId: props.object.trxId, objectId: props.object.id });
        }}
      >
        <MdInfoOutline className="text-18 opacity-50 -mb-px" />
        {lang.group.trxInfo}
      </MenuItem>
      {!('postId' in props.object) && postByMe && (
        <MenuItem
          className="text-black/60 text-14 gap-3 font-bold py-2"
          onClick={handleDeletePost}
        >
          <DeleteOutline className="text-18 opacity-50 -mb-px" />
          {lang.linkGroup.delete}
        </MenuItem>
      )}
      {/* <MenuItem onClick={() => shareGroup(activeGroup.group_id, object.id)}>
        <div className="flex items-center text-gray-600 leading-none pl-1 py-2 font-bold pr-5">
          <span className="flex items-center mr-3">
            <HiOutlineShare className="text-18 opacity-50" />
          </span>
          {lang.share}
        </div>
      </MenuItem> */}
    </Menu>
  );
};
