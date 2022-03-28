// import { sleep } from '~/utils';
// import { useStore } from '~/store';
// import { ICreateGroupsResult } from 'quorum-sdk-electron-renderer';
// import GroupApi from '~/apis/group';
// import useFetchGroups from '~/hooks/useFetchGroups';
// import { lang } from '~/utils/lang';
// import { initProfile } from '~/standaloneModals/initProfile';

export const useJoinGroup = () => {
  const dummy = (() => {}) as any;
  return dummy;
  // throw new Error('not implemeneted');
  // const {
  //   snackbarStore,
  //   activeGroupStore,
  // } = useStore();
  // const fetchGroups = useFetchGroups();

  // const joinGroupProcess = async (_seed: unknown, afterDone?: () => void) => {
  //   const seed = _seed as ICreateGroupsResult;
  //   await GroupApi.joinGroup(seed);
  //   await sleep(200);
  //   if (afterDone) {
  //     afterDone();
  //   }
  //   await fetchGroups();
  //   await sleep(100);
  //   await initProfile(seed.group_id);
  //   await sleep(100);
  //   activeGroupStore.setId(seed.group_id);
  //   await sleep(200);
  //   snackbarStore.show({
  //     message: lang.joined,
  //   });
  // };

  // return joinGroupProcess;
};
