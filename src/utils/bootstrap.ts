import { configure } from 'mobx';
import { create } from 'electron-log';

const rendererLog = create('renderer');
rendererLog.transports.file.maxSize = 10 * 1024 ** 2;
rendererLog.transports.ipc = null;
// eslint-disable-next-line no-console
const defaultLog = console.log.bind(console);

if (process.env.NODE_ENV !== 'development') {
  Object.assign(console, rendererLog.functions);

  rendererLog.transports.console = null as any;
  // eslint-disable-next-line no-console
  console.log = (...args: Array<any>) => {
    rendererLog.log(...args);
    const stack = new Error().stack!;
    const matchedStack = /at console.log.+?\n.+? at (.+? )?\((.+?)\)\n/.exec(stack);
    const location = matchedStack ? matchedStack[2].trim() : '';
    if (location.includes('node_modules') || !location) {
      defaultLog(...args);
    } else {
      defaultLog(...[`${location}\n`, ...args]);
    }
  };
}

configure({
  enforceActions: 'observed',
  computedRequiresReaction: false,
  reactionRequiresObservable: false,
  observableRequiresReaction: false,
});

rendererLog.log('');
rendererLog.log('');
rendererLog.log('');
rendererLog.log('app renderer started');
