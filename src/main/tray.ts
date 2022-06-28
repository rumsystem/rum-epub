import { BrowserWindow, Menu, Tray } from 'electron';
import { appIcon } from './icon';
import { mainLang } from './lang';


interface CreateTrayParams {
  getWin: () => BrowserWindow | null
  quit: () => unknown
}

export const createTray = (params: CreateTrayParams) => {
  const showApp = () => {
    params.getWin()?.show();
  };

  const tray = new Tray(appIcon);
  tray.on('click', showApp);
  tray.on('double-click', showApp);
  tray.setToolTip('Rum Epub');

  const updateLanguage = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: mainLang.lang.showWindow,
        click: showApp,
      },
      {
        label: mainLang.lang.exit,
        click: () => {
          params.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };
  updateLanguage();

  mainLang.onChange(() => {
    updateLanguage();
  });
};
