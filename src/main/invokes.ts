import { app, dialog, ipcMain, BrowserWindow } from 'electron';

ipcMain.handle('getUserDataPath', () => app.getPath('userData'));
ipcMain.handle('selectDir', async () => {
  const file = await dialog.showOpenDialog(BrowserWindow.getAllWindows()[0], {
    properties: ['openDirectory'],
  });
  const p = file.filePaths[0];
  if (file.canceled || !file.filePaths.length) {
    return null;
  }
  return p;
});
