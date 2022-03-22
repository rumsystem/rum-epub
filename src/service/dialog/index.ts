import React from 'react';
import { action, observable } from 'mobx';
import { createPromise } from '~/utils';

type DialogResult = 'confirm' | 'cancel';

export interface DialogItem {
  id: number
  title?: React.ReactNode
  content: React.ReactNode
  confirm?: React.ReactNode
  cancel?: React.ReactNode
  danger?: boolean
  confirmTestId?: string
  cancelTestId?: string
  hideCancel?: boolean
  rs: (type: DialogResult) => unknown
}

const state = observable({
  id: 0,
  dialogs: [] as Array<DialogItem>,
}, { dialogs: observable.shallow });

const open = action((params: Omit<DialogItem, 'id' | 'rs'>) => {
  state.id += 1;
  const id = state.id;

  const p = createPromise<DialogResult>();

  const item: DialogItem = observable({
    id,
    ...params,
    rs: (v) => {
      p.rs(v);
      window.setTimeout(action(() => {
        state.dialogs.splice(
          state.dialogs.indexOf(item),
          1,
        );
      }), 5000);
    },
  });

  state.dialogs.push(item);

  return p.p;
});

export const dialogService = {
  state,

  open,
};
