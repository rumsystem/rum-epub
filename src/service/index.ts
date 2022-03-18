import { nodeService } from './node';
import { quorumService } from './quorum';
import { epubService } from './epub';
import { readerSettingsService } from './readerSettings';

export const initService = () => {
  if (process.env.NODE_ENV === 'development') {
    Object.entries({
      nodeService,
      quorumService,
      epubService,
    }).forEach(([k, v]) => {
      (window as any)[k] = v;
    });
  }

  const disposes = [
    nodeService.init(),
    quorumService.init(),
    readerSettingsService.init(),
  ];

  return () => disposes.forEach((v) => v());
};
