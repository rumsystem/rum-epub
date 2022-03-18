import { app } from 'electron';

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  app.quit();
}
