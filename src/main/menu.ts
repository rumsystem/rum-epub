import {
  BrowserWindow,
  app,
  Menu,
  clipboard,
} from 'electron';
import { download } from 'electron-dl';
import { format } from 'date-fns';
import { mainLang } from './lang';

export class MenuBuilder {
  public language = 'cn' as 'cn' | 'en';
  private mainWindow: BrowserWindow;
  private prepareQuit: () => unknown;

  dispose = null;

  constructor(params: {
    win: BrowserWindow
    prepareQuit: () => unknown
  }) {
    this.mainWindow = params.win;
    this.prepareQuit = params.prepareQuit;

    mainLang.onChange(() => {
      this.rebuildMenu();
    });
  }

  buildMenu() {
    this.setupContextMenu();

    if (process.platform === 'darwin') {
      const template = this.buildDarwinTemplate();

      const menu = Menu.buildFromTemplate(template as any);
      Menu.setApplicationMenu(menu);
    } else {
      Menu.setApplicationMenu(null);
    }
  }

  rebuildMenu() {
    if (process.platform === 'darwin') {
      const template = this.buildDarwinTemplate();

      const menu = Menu.buildFromTemplate(template as any);
      Menu.setApplicationMenu(menu);
    } else {
      Menu.setApplicationMenu(null);
    }
  }

  setupContextMenu() {
    this.mainWindow.webContents.on('context-menu', (_event, props) => {
      const hasText = props.selectionText.trim().length > 0;

      const menuTemplate = [
        (process.env.NODE_ENV === 'development' || process.env.devtool) && {
          id: 'inspect',
          label: 'I&nspect Element',
          click: () => {
            (this.mainWindow as any).inspectElement(props.x, props.y);
            if (this.mainWindow.webContents.isDevToolsOpened()) {
              (this.mainWindow as any).webContents.devToolsWebContents.focus();
            }
          },
        },
        {
          id: 'cut',
          label: mainLang.lang.cut,
          accelerator: 'CommandOrControl+X',
          enabled: props.editFlags.canCut,
          visible: props.isEditable,
          click: (menuItem: any) => {
            const target = this.mainWindow.webContents;
            if (!menuItem.transform && target) {
              target.cut();
            } else {
              props.selectionText = menuItem.transform ? menuItem.transform(props.selectionText) : props.selectionText;
              clipboard.writeText(props.selectionText);
            }
          },
        },
        {
          id: 'copy',
          label: mainLang.lang.copy,
          accelerator: 'CommandOrControl+C',
          enabled: props.editFlags.canCopy,
          visible: props.isEditable || hasText,
          click: (menuItem: any) => {
            const target = this.mainWindow.webContents;

            if (!menuItem.transform && target) {
              target.copy();
            } else {
              props.selectionText = menuItem.transform ? menuItem.transform(props.selectionText) : props.selectionText;
              clipboard.writeText(props.selectionText);
            }
          },
        },
        {
          id: 'paste',
          label: mainLang.lang.paste,
          accelerator: 'CommandOrControl+V',
          enabled: props.editFlags.canPaste,
          visible: props.isEditable,
          click: (menuItem: any) => {
            const target = this.mainWindow.webContents;

            if (menuItem.transform) {
              let clipboardContent = clipboard.readText('clipboard');
              clipboardContent = menuItem.transform ? menuItem.transform(clipboardContent) : clipboardContent;
              target.insertText(clipboardContent);
            } else {
              target.paste();
            }
          },
        },
        {
          id: 'saveImageAs',
          label: mainLang.lang.saveImage,
          visible: props.mediaType === 'image',
          click: () => {
            download(
              this.mainWindow,
              props.srcURL,
              {
                saveAs: true,
                filename: `Rum${format(new Date(), 'yyyy-MM-dd_hh-MM-ss')}.jpg`,
              },
            );
          },
        },
      ].filter(Boolean);

      Menu.buildFromTemplate(menuTemplate as any).popup({ window: this.mainWindow });
    });
  }

  buildDarwinTemplate() {
    const subMenuAbout = {
      label: 'Rumbrary',
      submenu: [
        { label: mainLang.lang.service, submenu: [] },
        { type: 'separator' },
        {
          label: mainLang.lang.hide,
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: mainLang.lang.hideOther,
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: mainLang.lang.showAll, selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: mainLang.lang.quit,
          accelerator: 'Command+Q',
          click: () => {
            this.prepareQuit();
            app.quit();
          },
        },
      ],
    };
    const subMenuEdit = {
      label: mainLang.lang.edit,
      submenu: [
        { label: mainLang.lang.undo, accelerator: 'Command+Z', selector: 'undo:' },
        { label: mainLang.lang.redo, accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: mainLang.lang.cut, accelerator: 'Command+X', selector: 'cut:' },
        { label: mainLang.lang.copy, accelerator: 'Command+C', selector: 'copy:' },
        { label: mainLang.lang.paste, accelerator: 'Command+V', selector: 'paste:' },
        {
          label: mainLang.lang.selectAll,
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuView = {
      label: mainLang.lang.view,
      submenu: [
        {
          label: mainLang.lang.reload,
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: mainLang.lang.devtools,
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    const subMenuWindow = {
      label: mainLang.lang.window,
      submenu: [
        {
          label: mainLang.lang.min,
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: mainLang.lang.close, accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: mainLang.lang.front, selector: 'arrangeInFront:' },
      ],
    };

    const subMenuDebug = {
      label: mainLang.lang.debug,
      submenu: [
        {
          label: mainLang.lang.exportLogs,
          click: () => {
            this.mainWindow.webContents.send('export-logs');
          },
        },
      ],
    };

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow, subMenuDebug];
  }

  buildDefaultTemplate() {
    return [];
  }
}
