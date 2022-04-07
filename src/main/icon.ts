import { join } from 'path';

const iconMap = {
  other: '../../assets/pc_bar_icon.png',
  win32: '../../assets/icon.ico',
};
const platform = process.platform === 'win32'
  ? 'win32'
  : 'other';

export const appIcon = join(__dirname, iconMap[platform]);
