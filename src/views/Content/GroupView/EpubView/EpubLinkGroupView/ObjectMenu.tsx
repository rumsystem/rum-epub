import { Menu, MenuItem } from '@mui/material';
import { MdInfoOutline } from 'react-icons/md';
import { trxInfo } from '~/standaloneModals';
import { CommentRaw, PostRaw } from '~/service';
import { lang } from '~/utils';
import { postDetail } from '~/standaloneModals/postDetail';
import { Launch } from '@mui/icons-material';

interface Props {
  anchor?: HTMLElement | null
  object: PostRaw | CommentRaw
  open?: boolean
  onClose: () => unknown
}

export const ObjectMenu = (props: Props) => (
  <Menu
    anchorEl={props.anchor}
    open={!!props.open}
    onClose={props.onClose}
    anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    PaperProps={{ style: { margin: '10px 0 0 0' } }}
  >
    {!('postId' in props.object) && (
      <MenuItem
        className="text-black/70 text-14 gap-3 font-bold py-2"
        onClick={() => {
          postDetail({ groupId: props.object.groupId, postId: props.object.id });
        }}
      >
        <Launch className="text-18 opacity-50" />
        {lang.linkGroup.openInDetail}
      </MenuItem>
    )}
    <MenuItem
      className="text-black/70 text-14 gap-3 font-bold py-2"
      onClick={() => {
        props.onClose();
        trxInfo({ groupId: props.object.groupId, trxId: props.object.trxId, objectId: props.object.id });
      }}
    >
      <MdInfoOutline className="text-18 opacity-50" />
      {lang.group.info}
    </MenuItem>
    {/* <MenuItem onClick={() => shareGroup(activeGroup.group_id, object.id)}>
        <div className="flex items-center text-gray-600 leading-none pl-1 py-2 font-bold pr-5">
          <span className="flex items-center mr-3">
            <HiOutlineShare className="text-18 opacity-50" />
          </span>
          {lang.share}
        </div>
      </MenuItem> */}
    {/* {activeGroup.user_pubkey === object.publisher && (
        <div>
          <MenuItem onClick={() => {
              props.onClickUpdateMenu();
              handleMenuClose();
            }}
            >
              <div className="flex items-center text-gray-600 leading-none pl-1 py-2 font-bold pr-2">
                <span className="flex items-center mr-3">
                  <MdOutlineEdit className="text-18 opacity-50" />
                </span>
                <span>编辑</span>
              </div>
            </MenuItem>
          <MenuItem onClick={() => {
            props.onClickDeleteMenu?.();
            handleMenuClose();
          }}
          >
            <div className="flex items-center text-red-400 leading-none pl-1 py-2 font-bold pr-2">
              <span className="flex items-center mr-3">
                <MdClose className="text-18 opacity-50" />
              </span>
              <span>删除</span>
            </div>
          </MenuItem>
        </div>
      )} */}
  </Menu>
);
