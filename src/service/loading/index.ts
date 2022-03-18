import { action, observable } from 'mobx';

export interface DialogItem {
  id: number
  reason: string
  closeTime: number
}

const state = observable({
  id: 0,
  loadings: [] as Array<DialogItem>,
}, { loadings: observable.shallow });

const add = action((reason: string, timeout = 60000) => {
  state.id += 1;
  const id = state.id;

  const item: DialogItem = observable({
    id,
    reason,
    closeTime: Date.now() + timeout,
  });

  const handleClose = () => {
    const index = state.loadings.findIndex((v) => v.id === id);
    if (index !== -1) {
      state.loadings.splice(index, 1);
    }
  };

  window.setTimeout(handleClose, timeout);

  state.loadings.push(item);

  return {
    close: handleClose,
  };
});

export const loadingService = {
  state,

  add,
};
