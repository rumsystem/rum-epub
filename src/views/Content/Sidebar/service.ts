import { action, observable } from 'mobx';

const state = observable({
  collapsed: false,
});

const toggleSidebar = action(() => {
  state.collapsed = !state.collapsed;
});

export const sidebarService = {
  state,

  toggleSidebar,
};
