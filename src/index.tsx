import './utils/bootstrap';
import { ipcRenderer } from 'electron';
import { createRoot } from 'react-dom/client';
import { App } from './views';

import css from './styles/tailwind-base.sass?inline';
import './styles/tailwind.sass';
import './styles/App.global.css';
import './styles/rendered-markdown.sass';
import 'react-image-crop/dist/ReactCrop.css';

ipcRenderer.setMaxListeners(20);

const style = document.createElement('style');
style.innerHTML = css;
const node = Array.from(document.head.childNodes)
  .filter((v) => v.nodeType === 8)
  .find((v) => v.textContent?.includes('preflight-injection-point'));
document.head.insertBefore(style, node!);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
