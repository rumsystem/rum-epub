import { BrowserWindow, Menu, Tray } from 'electron';
import { appIcon } from './icon';

let tray: Tray;

interface CreateTrayParams {
  getWin: () => BrowserWindow | null
  quit: () => unknown
}

export const createTray = (params: CreateTrayParams) => {
  tray = new Tray(appIcon);
  const showApp = () => {
    params.getWin()?.show();
  };
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主界面',
      click: showApp,
    },
    {
      label: '退出',
      click: () => {
        params.quit();
      },
    },
  ]);
  tray.on('click', showApp);
  tray.on('double-click', showApp);
  tray.setToolTip('Rum Epub');
  tray.setContextMenu(contextMenu);
};
