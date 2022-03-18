import Store from 'electron-store';

export default {
  get() {
    return new Store({
      name: 'quorum-sdk'
    })
  }
}