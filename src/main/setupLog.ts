import { ipcMain } from 'electron';
import { functions, log, transports } from 'electron-log';
import { join, parse } from 'path';

transports.file.maxSize = 10 * 1024 ** 2;

Object.assign(console, functions);

// Main process
ipcMain.handle('get-main-log-path', () => {
  const file = transports.file.getFile();
  const filePath = file.path;
  const inf = parse(filePath);
  const oldPath = join(inf.dir, inf.name + '.old' + inf.ext);

  return [filePath, oldPath];
});

log('');
log('');
log('');
log('app started');
