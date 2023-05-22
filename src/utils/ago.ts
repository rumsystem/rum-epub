import { format } from 'date-fns';
import { lang } from '~/utils/lang';

const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export const ago = (blockTimeStamp: number, options: { trimmed?: boolean } = {}) => {
  const time = new Date(blockTimeStamp > 10 ** 14 ? blockTimeStamp / 1000000 : blockTimeStamp);
  const now = new Date().getTime();
  const past = new Date(time).getTime();
  const diffValue = now - past;
  const day = diffValue / DAY;
  const hour = diffValue / HOUR;
  const min = diffValue / MINUTE;
  let result = '';
  const isLastYear = new Date().getFullYear() > time.getFullYear();
  if (isLastYear) {
    result = format(time, options.trimmed ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
  } else if (day > 7) {
    result = format(time, options.trimmed ? 'MM-dd' : 'MM-dd HH:mm');
  } else if (day >= 1) {
    result = Math.floor(day) + ' ' + lang.ago.daysAgo;
  } else if (hour >= 1) {
    result = Math.floor(hour) + ' ' + lang.ago.hoursAgo;
  } else if (min >= 1) {
    result = Math.floor(min) + ' ' + lang.ago.minutesAgo;
  } else {
    result = lang.ago.justNow;
  }
  return result;
};
