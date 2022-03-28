import './processLock';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import ElectronStore from 'electron-store';
import { initialize, enable } from '@electron/remote/main';

import { sleep } from './utils';
import { MenuBuilder } from './menu';
import { initQuorum, state as quorumState } from './quorum';
import { createTray } from './tray';

initialize();

const isDevelopment = process.env.NODE_ENV === 'development';
// const isProduction = !isDevelopment;

const store = new ElectronStore();

const main = () => {
  const state = {
    win: null as null | BrowserWindow,
    canQuit: false,
  };
  ElectronStore.initRenderer();
  const createWindow = async () => {
    if (isDevelopment) {
      process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
      // wait 3 second for webpack to be up
      await sleep(3000);
    }

    state.win = new BrowserWindow({
      width: 1600,
      height: 900,
      minWidth: 768,
      minHeight: 780,
      webPreferences: {
        contextIsolation: false,
        // enableRemoteModule: true,
        nodeIntegration: true,
        webSecurity: !isDevelopment,
        webviewTag: true,
      },
    });

    enable(state.win.webContents);

    const port = process.env.PORT || 31521;
    if (isDevelopment) {
      state.win.loadURL(`http://localhost:${port}/dist/index.html`);
    } else {
      state.win.loadFile('dist/index.html');
    }

    const menuBuilder = new MenuBuilder(state.win);
    menuBuilder.buildMenu();

    state.win.on('close', async (e) => {
      if (state.canQuit) {
        return;
      }
      e.preventDefault();
      state.win?.hide();
      if (process.platform === 'win32') {
        const notice = !store.get('not-notice-when-close');
        if (!notice) {
          return;
        }
        try {
          const res = await dialog.showMessageBox({
            type: 'info',
            buttons: ['确定'],
            title: '窗口最小化',
            message: 'RUM Epub App将继续在后台运行, 可通过系统状态栏重新打开界面',
            checkboxLabel: '不再提示',
          });
          if (res?.checkboxChecked) {
            store.set('not-notice-when-close', true);
          }
        } catch {}
      }
    });
  };

  app.on('before-quit', (e) => {
    if (!state.canQuit) {
      e.preventDefault();
    }
  });

  app.on('window-all-closed', () => {});

  app.on('second-instance', () => {
    if (state.win) {
      if (!state.win.isVisible()) state.win.show();
      if (state.win.isMinimized()) state.win.restore();
      state.win.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      state.win?.show();
    }
  });

  app.on('certificate-error', (event, _webContents, _url, _error, certificate, callback) => {
    const serverCert = certificate.data.trim();
    const userInputCert = quorumState.userInputCert.trim();
    const distCert = quorumState.cert.trim();
    const certValid = userInputCert
      ? userInputCert === serverCert
      : distCert === serverCert;
    if (certValid) {
      event.preventDefault();
      callback(true);
      return;
    }
    callback(false);
  });

  try {
    initQuorum();
  } catch (err) {
    console.error('Quorum err: ');
    console.error(err);
  }

  ipcMain.on('inspect-picker', () => {
    const w = state.win as any;
    if (!w || !isDevelopment) {
      return;
    }
    if (w.webContents.isDevToolsOpened()) {
      w.devToolsWebContents.executeJavaScript('DevToolsAPI.enterInspectElementMode()');
    } else {
      w.webContents.once('devtools-opened', () => {
        w.devToolsWebContents.executeJavaScript('DevToolsAPI.enterInspectElementMode()');
      });
      w.openDevTools();
    }
  });

  app.whenReady().then(() => {
    if (isDevelopment) {
      console.log('Starting main process...');
    }
    createWindow();
    if (process.platform !== 'darwin') {
      createTray({
        getWin: () => state.win,
        quit: () => {
          state.canQuit = true;
          app.quit();
        },
      });
    }
  });
};

if (app.hasSingleInstanceLock()) {
  main();
}
