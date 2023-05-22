import { IContentItem } from 'rum-fullnode-sdk/dist/apis/content';
import { bookGroupActivityChecker } from './bookGroup';
import { linkGroupActivityChecker } from './linkGroup';

export * from './bookGroup';
export * from './linkGroup';

export const activityChecker = {
  ...bookGroupActivityChecker,
  ...linkGroupActivityChecker,
  isEmptyObject(item: IContentItem) {
    return !item.Data || (typeof item.Data === 'object' && Object.keys(item.Data).length === 0);
  },
};
