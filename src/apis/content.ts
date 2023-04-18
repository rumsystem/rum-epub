import { getClient } from './client';

export const fetchContents = (
  groupId: string,
  options: {
    num: number
    starttrx?: string
    reverse?: boolean
    includestarttrx?: boolean
  },
) => getClient().Content.list(groupId, {
  num: options.num,
  start_trx: options.starttrx ?? '',
  reverse: options.reverse ?? false,
  include_start_trx: options.includestarttrx ?? false,
});

export const postContent = (content: unknown, groupId: string) => getClient().Content.create(groupId, content as any);
