import { ContentTaskManager } from './ContentTaskManager';
import { EmptyContentManager } from './EmptyContentManager';
import { SocketManager } from './SocketManager';

export type * from './types';

const state = {
  bookPollingManager: null as null | BookPollingManager,
};

export class BookPollingManager {
  private contentTaskManager = new ContentTaskManager();
  private emptyContentManager = new EmptyContentManager(this.contentTaskManager);
  private socketManager = new SocketManager(this.contentTaskManager, this.emptyContentManager);

  public start() {
    this.contentTaskManager.start();
    this.emptyContentManager.init();
    this.socketManager.start();
  }

  public stop() {
    this.socketManager.stop();
    this.contentTaskManager.destroy();
  }
}

const initAfterDB = () => {
  state.bookPollingManager = new BookPollingManager();
  state.bookPollingManager.start();

  return () => {
    state.bookPollingManager?.stop();
  };
};

export const pollingService = {
  initAfterDB,
};
