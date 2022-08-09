import { ipcMain } from 'electron';

class MainLang {
  private language = 'cn' as 'cn' | 'en';
  private listeners: Array<() => unknown> = [];
  private cn = {
    service: '服务',
    hide: '隐藏',
    hideOther: '隐藏其他',
    showAll: '显示所有',
    quit: '退出',

    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    saveImage: '将图片另存为(&v)…',
    selectAll: '全选',

    view: '视图',
    reload: '重新加载此页',
    devtools: '切换开发者工具',

    window: '窗口',
    min: '最小化',
    close: '关闭',
    front: '前置全部窗口',

    debug: '调试',
    exportLogs: '导出调试包',

    confirm: '确定',
    minimize: '窗口最小化',
    minimizeTip: 'Rumbrary 将继续在后台运行, 可通过系统状态栏重新打开界面',
    dontShowAgain: '不再提示',

    showWindow: '显示主界面',
    exit: '退出',
  };

  private en = {
    service: 'Service',
    hide: 'Hide',
    hideOther: 'Hide Other',
    showAll: 'Show All',
    quit: 'Quit',

    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    saveImage: 'Sa&ve Image As…',
    selectAll: 'Select All',

    view: 'View',
    reload: 'Reload App',
    devtools: 'Toggle Devtools',

    window: 'window',
    min: 'Minimize',
    close: 'Close',
    front: 'Arrange In Front',

    debug: 'Debug',
    exportLogs: 'Export Logs',
    confirm: 'confirm',
    minimize: 'Minimize',
    minimizeTip: 'Rumbrary is running in background, re-open it by clicking icon in system tray',
    dontShowAgain: 'don\'t show it again',

    showWindow: 'Open Main Window',
    exit: 'Exit',
  };

  get lang() {
    return this[this.language];
  }

  public constructor() {
    ipcMain.on('change-language', (_, lang) => {
      const oldLang = this.language;
      this.language = lang;
      if (oldLang !== lang) {
        this.listeners.forEach((v) => v());
      }
    });
  }

  public onChange(fn: () => unknown) {
    this.listeners.push(fn);
  }
}

export const mainLang = new MainLang();
