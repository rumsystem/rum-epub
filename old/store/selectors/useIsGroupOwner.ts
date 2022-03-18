import { isEmpty } from 'lodash';
import { IGroup } from 'quorum-sdk-electron-renderer';

export default (group: IGroup) => {
  if (!group || isEmpty(group)) {
    return false;
  }

  return group.owner_pubkey === group.user_pubkey;
};
