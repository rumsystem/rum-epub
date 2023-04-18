import { IContentItem } from '~/apis';
import { activityChecker } from '../../types';
import { handleBook } from './handleBook';
import { handleBookSegment } from './handleBookSegment';
import { handleCover } from './handleCover';
import { handleCoverSegment } from './handleCoverSegment';
import { handleBookMetadata } from './handleBookMetadata';
import { handleEmptyObjects } from './handleEmptyObjects';

export const handleContents = async (groupId: string, contents: Array<IContentItem>, isPendingObjects = false) => {
  const list = [
    [handleBook, contents.filter(activityChecker.isBookSummary)],
    [handleBookSegment, contents.filter(activityChecker.isBookSegment)],
    [handleCover, contents.filter(activityChecker.isCoverSummary)],
    [handleCoverSegment, contents.filter(activityChecker.isCoverSegment)],
    [handleBookMetadata, contents.filter(activityChecker.isBookMetadata)],
    [handleEmptyObjects, contents.filter(activityChecker.isEmptyObject)],
  ] as const;
  for (const item of list) {
    const [fn, objects] = item;
    if (objects.length) {
      const dedupedObjects = objects.filter((v, i) => objects.findIndex((u) => u.TrxId === v.TrxId) === i);
      await fn({ groupId, objects: dedupedObjects, isPendingObjects });
    }
  }
};
