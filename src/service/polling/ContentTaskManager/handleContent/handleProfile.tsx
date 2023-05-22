import { utils } from 'rum-sdk-browser';
import type { IContentItem } from '~/apis';
import { dbService, Profile } from '~/service/db';
import { parseTime } from '~/utils';
import { ProfileType } from '../../types';
import { observable, runInAction } from 'mobx';
import { linkGroupService } from '~/service/linkGroup';

interface IOptions {
  groupId: string
  objects: IContentItem[]
  isPendingObjects?: boolean
}

export const handleProfile = async (options: IOptions) => {
  const { groupId, objects } = options;
  if (objects.length === 0) { return; }
  const db = dbService.db;

  try {
    await db.transaction('rw', [db.profile], async () => {
      const items = objects.map((v) => ({
        content: v,
        activity: v.Data as any as ProfileType,
      }));

      const existedProfiles = await dbService.getProfile(items.map((v) => ({ groupId, trxId: v.content.TrxId })));
      const profilesToPut: Array<Profile> = [];
      for (const item of items) {
        const object = item.activity.object;
        const trxId = item.content.TrxId;
        const userAddress = utils.pubkeyToAddress(item.content.SenderPubkey);
        const existedProfile = existedProfiles.find((v) => v.trxId === trxId);
        const timestamp = parseTime(item.activity.published, item.content.TimeStamp);
        if (existedProfile) {
          const updateExistedProfile = existedProfile.status === 'pending' && existedProfile.userAddress === userAddress;
          if (updateExistedProfile) {
            existedProfile.status = 'synced';
            profilesToPut.push(existedProfile);
          }
          continue;
        }

        if (userAddress !== object.describes.id) {
          // not posting profile for publisher
          return;
        }

        const image = !('image' in object)
          ? null
          : Array.isArray(object.image)
            ? object.image[0]
            : object.image;

        profilesToPut.push({
          trxId: item.content.TrxId,
          timestamp,
          status: 'synced',
          groupId,
          userAddress,
          name: object.name,
          ...image ? { avatar: image } : {},
        });
      }

      await dbService.putProfile(profilesToPut);
      runInAction(() => {
        profilesToPut.forEach((profile) => {
          const key = `${profile.groupId}-${profile.userAddress}`;
          if (linkGroupService.state.profile.mapByAddress.has(key)) {
            linkGroupService.state.profile.mapByAddress.set(key, observable(profile));
          }
        });
      });
    });
  } catch (e) {
    console.error(e);
  }
};
