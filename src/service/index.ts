import { nodeService } from './node';
import { quorumService } from './quorum';
import { epubService } from './epub';
import { readerSettingsService } from './readerSettings';
import { updateService } from './update';

export const initService = () => {
  if (process.env.NODE_ENV === 'development') {
    Object.entries({
      nodeService,
      quorumService,
      epubService,
      updateService,
    }).forEach(([k, v]) => {
      (window as any)[k] = v;
    });
  }

  const disposes = [
    nodeService.init(),
    quorumService.init(),
    readerSettingsService.init(),
    epubService.init(),
    updateService.init(),
  ];

  return () => disposes.forEach((v) => v());
};
