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

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
