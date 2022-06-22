import { nodeService } from './node';
import { quorumService } from './quorum';
import { dbService } from './db';
import { epubService } from './epub';
import { readerSettingsService } from './readerSettings';
import { updateService } from './update';
import { trxAckService } from './trxAck';
import { profileService } from './profile';
import { escService } from './esc';

import { ConfirmDialogContainer } from './dialog/ConfirmDialogContainer';
import { LoadingContainer } from './loading/LoadingContainer';
import { TooltipContainer } from './tooltip/TooltipContainer';
import { UpdateContainer } from './update/UpdateContainer';

export * from './bus';
export * from './db';
export * from './dialog';
export * from './epub';
export * from './esc';
export * from './i18n';
export * from './loading';
export * from './node';
export * from './profile';
export * from './quorum';
export * from './readerSettings';
export * from './tooltip';
export * from './trxAck';
export * from './update';

export const initService = () => {
  if (process.env.NODE_ENV === 'development') {
    Object.entries({
      nodeService,
      quorumService,
      epubService,
      updateService,
      dbService,
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
    trxAckService.init(),
    escService.init(),
  ];

  return () => disposes.forEach((v) => v());
};

export const initServiceAfterDB = () => {
  const disposes = [
    nodeService.startPolling(true),
    profileService.init(),
    epubService.initAfterDB(),
  ];

  return () => disposes.forEach((v) => v());
};

export const serviceViewContainers = [
  ConfirmDialogContainer,
  LoadingContainer,
  TooltipContainer,
  UpdateContainer,
];
