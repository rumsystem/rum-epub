import React from 'react';
import { ipcRenderer } from 'electron';
import { createRoot } from 'react-dom/client';
import { configure } from 'mobx';
import { App } from './views';

import './styles/tailwind.sass';
import './styles/tailwind-base.sass';
import './styles/App.global.css';
import './styles/rendered-markdown.sass';

if (process.env.IS_ELECTRON) {
  ipcRenderer.setMaxListeners(20);
}

configure({
  enforceActions: 'observed',
  computedRequiresReaction: false,
  reactionRequiresObservable: false,
  observableRequiresReaction: false,
});

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
