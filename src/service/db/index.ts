import { Database } from './database';

export * from './database';

const state = {
  db: null as null | Database,
};

export const initDb = (hash: string) => {
  if (state.db) {
    return;
  }
  const db = new Database(`${hash}-rum-epub`);
  state.db = db;
};

export const init = () => () => {
  state.db?.close();
};

export const dbService = {
  get db() {
    if (!state.db) {
      throw new Error('try using db before init');
    }
    (window as any).db = state.db;
    return state.db;
  },
  init,
  initDb,
};
