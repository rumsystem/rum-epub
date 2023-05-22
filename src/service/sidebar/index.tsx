import { action, observable, reaction, runInAction } from 'mobx';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'SIDEBAR_COLLAPSED_STORAGE_KEY';

const state = observable({
  collapsed: false,
});

const toggleSidebar = action(() => {
  state.collapsed = !state.collapsed;
});

const init = () => {
  const value = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  runInAction(() => {
    state.collapsed = value === 'true';
  });

  return reaction(
    () => state.collapsed,
    () => {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, JSON.stringify(state.collapsed));
    },
  );
};

export const sidebarService = {
  init,
  state,

  toggleSidebar,
};
