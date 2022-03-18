import TimelineIcon from 'assets/template/template_icon_timeline.svg?react';

import { GROUP_TEMPLATE_TYPE } from './constant';

const groupIconMap = new Map<string, React.FunctionComponent<React.SVGProps<SVGSVGElement>>>([
  [GROUP_TEMPLATE_TYPE.EPUB, TimelineIcon],
]);

export const getGroupIcon = (appKey: string) => {
  const GroupTypeIcon = groupIconMap.get(appKey) ?? TimelineIcon;
  return GroupTypeIcon;
};
