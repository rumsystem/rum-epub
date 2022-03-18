declare module 'quorum-sdk-electron-main' {
  import { ChildProcess } from 'child_process';

  export const state: {
    process: null | ChildProcess
    port: number
    storagePath: string
    logs: string
    cert: string
    up: boolean
  };

  export interface InitOptions {
    nodeModulesParentPath?: string
    quorumBinPath: string
  }

  export const init: (options?: InitOptions) => Promise<unknown>;
}
