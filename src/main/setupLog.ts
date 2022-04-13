import { ipcMain } from 'electron';
import { create } from 'electron-log';
import { join, parse } from 'path';

const mainLog = create('main');
mainLog.transports.file.maxSize = 10 * 1024 ** 2;
mainLog.transports.ipc = null;

Object.assign(console, mainLog.functions);

// Main process
ipcMain.handle('get-main-log-path', () => {
  const file = mainLog.transports.file.getFile();
  const filePath = file.path;
  const inf = parse(filePath);
  const oldPath = join(inf.dir, inf.name + '.old' + inf.ext);

  return [filePath, oldPath];
});

mainLog.log('');
mainLog.log('');
mainLog.log('');
mainLog.log('app started');
