import { observable, runInAction } from 'mobx';
import { GlobalProfile } from '~/service/db';
import { defaultAvatar } from '~/utils/avatars';
import { nodeService } from '../node';
import { sleep } from '~/utils';

const state = observable({
  currentProfile: {
    name: '',
  } as GlobalProfile['profile'],

  get profileName() {
    return state.currentProfile.name || nodeService.state.nodeInfo.node_publickey.substring(0, 6);
  },
  get profileImage() {
    return profileService.state.currentProfile.image?.content
      ? `data:image/jpeg/;base64,${profileService.state.currentProfile.image?.content}`
      : defaultAvatar;
  },
});

const setProfile = async (profile: GlobalProfile['profile']) => {
  await sleep(1);
  // await dbService.db.globalProfile.add({
  //   profile,
  // });

  runInAction(() => {
    state.currentProfile = profile;
  });
};

// dbService.db.globalProfile.toCollection().last().then((profile) => {
//   runInAction(() => {
//     if (profile?.profile) {
//       state.currentProfile = profile.profile;
//     }
//   });
// });
const init = () => () => 1;

export const profileService = {
  init,

  state,
  setProfile,
};
