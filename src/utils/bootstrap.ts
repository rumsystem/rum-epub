import { configure } from 'mobx';
import { functions, log, transports } from 'electron-log';

transports.file.maxSize = 10 * 1024 ** 2;

// eslint-disable-next-line no-console
const defaultLog = console.log.bind(console);

Object.assign(console, functions);

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.log = (...args: Array<any>) => {
    log(...args);
    const stack = new Error().stack!;
    const matchedStack = /at console.log.*\n.*?\((.*)\)/.exec(stack);
    const location = matchedStack ? matchedStack[1].trim() : '';
    if (location.includes('node_modules')) {
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

log('');
log('');
log('');
log('app renderer started');
