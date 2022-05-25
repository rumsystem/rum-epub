import { action } from 'mobx';

export type CallbackFn = (...args: Array<any>) => unknown;

const state = {
  listeners: [] as Array<CallbackFn>,
};

const add = (cb: CallbackFn) => {
  state.listeners.push(cb);

  return action(() => {
    const index = state.listeners.indexOf(cb);
    if (index !== -1) {
      state.listeners.splice(index, 1);
    }
  });
};

const init = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      const fn = state.listeners.at(-1);
      if (fn) {
        fn();
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
};

const noop = (() => 1) as CallbackFn;

export const escService = {
  init,
  add,
  noop,
};
