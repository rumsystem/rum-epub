import { observable } from 'mobx';

export const myLibraryState = observable({
  closeCurrent: null as null | (() => unknown),
  get opened() {
    return !!this.closeCurrent;
  },
});
