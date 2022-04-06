import { BrowserWindow, Menu, Tray } from 'electron';
import { join } from 'path';

let tray: Tray;

interface CreateTrayParams {
  getWin: () => BrowserWindow | null
  quit: () => unknown
}

export const createTray = (params: CreateTrayParams) => {
  const iconMap = {
    other: '../../assets/pc_bar_icon.png',
    win32: '../../assets/icon.ico',
  };
  const platform = process.platform === 'win32'
    ? 'win32'
    : 'other';

  const icon = join(__dirname, iconMap[platform]);

  tray = new Tray(icon);
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
