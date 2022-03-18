import { action, observable } from 'mobx';

type TooltipType = 'default' | 'error';

export interface TooltipItem {
  id: number
  content: string
  type?: TooltipType
  /** default 2000ms */
  timeout?: number
}

const state = observable({
  id: 0,
  items: [] as Array<TooltipItem>,
}, { items: observable.shallow });

const show = action((params: Omit<TooltipItem, 'id'>) => {
  state.id += 1;
  const id = state.id;

  const item = observable({
    id,
    ...params,
  });

  state.items.push(item);

  window.setTimeout(action(() => {
    state.items.splice(
      state.items.indexOf(item),
      1,
    );
  }), params.timeout ?? 2000);
});

export const tooltipService = {
  state,

  show,
};
