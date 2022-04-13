import { join } from 'path';

const iconMap = {
  other: '../../assets/icon_lib.png',
  win32: '../../assets/icon.ico',
};
const platform = process.platform === 'win32'
  ? 'win32'
  : 'other';

export const appIcon = join(__dirname, iconMap[platform]);
