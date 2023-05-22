import { IContentItem } from '~/apis';
import { nodeService } from '~/service/node';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { activityChecker } from '../../types';
import { handleBook } from './handleBook';
import { handleBookSegment } from './handleBookSegment';
import { handleCover } from './handleCover';
import { handleCoverSegment } from './handleCoverSegment';
import { handleBookMetadata } from './handleBookMetadata';
import { handleEmptyObjects } from './handleEmptyObjects';
import { handlePost } from './handlePost';
import { handleComment } from './handleComment';
import { handleProfile } from './handleProfile';
import { handleCounter } from './handleCounter';

export const handleContents = async (groupId: string, contents: Array<IContentItem>, isPendingObjects = false) => {
  const group = nodeService.state.groups.find((v) => v.group_id === groupId);
  if (!group) {
    throw new Error('group not exist');
  }
  let list;
  if (group.app_key === GROUP_TEMPLATE_TYPE.EPUB) {
    list = [
      [handleBook, contents.filter(activityChecker.isBookSummary)],
      [handleBookSegment, contents.filter(activityChecker.isBookSegment)],
      [handleCover, contents.filter(activityChecker.isCoverSummary)],
      [handleCoverSegment, contents.filter(activityChecker.isCoverSegment)],
      [handleBookMetadata, contents.filter(activityChecker.isBookMetadata)],
      [handleEmptyObjects, contents.filter(activityChecker.isEmptyObject)],
    ] as const;
  } else {
    list = [
      [handlePost, contents.filter(activityChecker.isPost)],
      [handleComment, contents.filter(activityChecker.isComment)],
      [handleProfile, contents.filter(activityChecker.isProfile)],
      [handleCounter, contents.filter(activityChecker.isCounter)],
    ] as const;
  }
  for (const item of list) {
    const [fn, objects] = item;
    if (objects.length) {
      const dedupedObjects = objects.filter((v, i) => objects.findIndex((u) => u.TrxId === v.TrxId) === i);
      await fn({ groupId, objects: dedupedObjects, isPendingObjects });
    }
  }
};
