import './utils/bootstrap';
import { ipcRenderer } from 'electron';
import { createRoot } from 'react-dom/client';
import { App } from './views';


import './styles/tailwind.sass';
import './styles/App.global.css';
import './styles/rendered-markdown.sass';
import 'react-image-crop/dist/ReactCrop.css';

if (process.env.IS_ELECTRON) {
  ipcRenderer.setMaxListeners(20);
}

if (process.env.NODE_ENV === 'production') {
  import('./styles/tailwind-base.sass?inline').then((v) => {
    const injectStyleTo = (comment: string, css: string) => {
      const style = document.createElement('style');
      style.innerHTML = css;
      const commentNode = Array.from(document.head.childNodes)
        .filter((v) => v.nodeType === 8)
        .find((v) => v.textContent?.includes(comment))!;
      document.head.insertBefore(style, commentNode);
    };
    injectStyleTo('preflight-injection-point', v.default);
  });
} else {
  import('./styles/tailwind-base.sass');
}


const root = createRoot(document.getElementById('root')!);
root.render(<App />);
