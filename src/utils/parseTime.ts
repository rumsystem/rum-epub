import { parseISO } from 'date-fns';

export const parseTime = (published: string | undefined, timestamp: string) => {
  if (published) {
    try {
      return parseISO(published).getTime();
    } catch (e) {}
  }
  return Number(timestamp.slice(0, -6));
};
