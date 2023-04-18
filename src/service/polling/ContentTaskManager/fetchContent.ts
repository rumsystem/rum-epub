// import { uniqBy } from 'lodash';
// import ContentApi, { IContentItem } from 'apis/content';
// import * as PendingTrxModel from 'hooks/useDatabase/models/pendingTrx';
// import useDatabase from 'hooks/useDatabase';
// import { store } from 'store';
import { dbService } from '~/service/db';
import { fetchContents } from '~/apis';
import { handleContents } from './handleContent';

const DEFAULT_OBJECTS_LIMIT = 20;

export const fetchContentsTask = async (groupId: string, limit = DEFAULT_OBJECTS_LIMIT) => {
  const groupStatus = await dbService.getGroupStatus(groupId);

  try {
    let contents = await fetchContents(groupId, {
      num: limit,
      starttrx: groupStatus?.trxId ?? '',
    }) || [];

    if (contents.length === 0) { return []; }

    contents = contents.filter((v, i, a) => a.findIndex((u) => u.TrxId === v.TrxId) === i);
    contents.sort((a, b) => Number(a.TimeStamp) - Number(b.TimeStamp));

    await handleContents(groupId, contents);
    await dbService.setGroupStatus(groupId, contents.at(-1)!.TrxId);

    // await dbService.db.transaction('rw', [], async () => {
    //   // const pendingTrxs = await PendingTrxModel.getByGroupId(database, groupId);
    //   // await handleContents(groupId, pendingTrxs.map((v) => v.value));
    // });

    return contents;
  } catch (err) {
    console.error(err);
    return [];
  }
};
