import { Menu, MenuItem } from '@mui/material';
import { MdInfoOutline } from 'react-icons/md';
import { trxInfo } from '~/standaloneModals/trxInfo';
import { Comment, Post } from '~/service';
import { lang } from '~/utils';

interface Props {
  anchor?: HTMLElement | null
  object: Post | Comment
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
  </Menu>
);
