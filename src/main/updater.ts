import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

const state = {
  inited: false,
};

const events = [
  'update-not-available',
  'update-available',
  'error',
  'download-progress',
  'update-downloaded',
];
events.forEach((eventName) => {
  autoUpdater.on(eventName, (data) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      console.log('send', data);
      win.webContents.send('rum-updater', {
        type: eventName,
        data,
      });
    });
  });
});

export const initUpdate = (p: { setCanQuit: () => unknown }) => {
  if (process.env.NODE_ENV === 'development') {
    return;
  }
  if (state.inited) {
    return;
  }
  state.inited = true;

  ipcMain.on('rum-updater', (_e, a) => {
    if (a.action === 'update') {
      autoUpdater.checkForUpdates();
    }
    if (a.action === 'install') {
      p.setCanQuit();
      autoUpdater.quitAndInstall();
    }
  });

  const autoUpdate = () => {
    autoUpdater.checkForUpdates();
    setTimeout(autoUpdate, 5 * 60 * 1000);
  };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdate();
};
