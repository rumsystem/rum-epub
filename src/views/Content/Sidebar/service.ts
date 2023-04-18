import { action, observable } from 'mobx';

const state = observable({
  // TODO: remember
  collapsed: false,
});

const toggleSidebar = action(() => {
  state.collapsed = !state.collapsed;
});

export const sidebarService = {
  state,

  toggleSidebar,
};
