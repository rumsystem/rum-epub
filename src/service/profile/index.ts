import { observable, runInAction } from 'mobx';
import { GlobalProfile, dbService } from '~/service/db';
import { defaultAvatar } from '~/utils/avatars';
import { nodeService } from '../node';

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
  await dbService.db.globalProfile.add({
    profile,
  });

  runInAction(() => {
    state.currentProfile = profile;
  });
};

const init = () => {
  dbService.db.globalProfile.toCollection().last().then((profile) => {
    runInAction(() => {
      if (profile?.profile) {
        state.currentProfile = profile.profile;
      }
    });
  });

  return () => 1;
};

export const profileService = {
  init,

  state,
  setProfile,
};
