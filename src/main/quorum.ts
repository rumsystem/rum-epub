import path, { join, parse } from 'path';
import fs from 'fs';
import childProcess, { ChildProcess } from 'child_process';
import { app, ipcMain } from 'electron';
import { create } from 'electron-log';
import getPort from 'get-port';
import ElectronStore from 'electron-store';
import toml from '@iarna/toml';

const store = new ElectronStore({
  name: 'quorum_port_store',
});

const quorumLog = create('quorum');
quorumLog.transports.file.fileName = 'quorum.log';
quorumLog.transports.console = (() => { }) as any;
quorumLog.transports.ipc = null;

const quorumBaseDir = app.isPackaged
  ? path.join(process.resourcesPath, 'quorum-bin')
  : path.join(app.getAppPath(), 'node_modules', 'quorum-bin');
const quorumFileName = {
  linux: 'quorum_linux',
  darwin: 'quorum_darwin',
  win32: 'quorum_win.exe',
};
const cmd = path.join(
  quorumBaseDir,
  quorumFileName[process.platform as keyof typeof quorumFileName],
);

export const state = {
  process: null as null | ChildProcess,
  bootstraps: '',
  port: 0,
  storagePath: '',
  cert: '',

  get up() {
    return !!this.process;
  },
};

export const actions = {
  status() {
    return {
      up: state.up,
      bootstraps: state.bootstraps,
      storagePath: state.storagePath,
      port: state.port,
      cert: state.cert,
    };
  },
  async up(param: {
    storagePath: string
    password?: string
    bootstraps: Array<string>
  }) {
    if (state.up) {
      return this.status();
    }
    const { storagePath, password = '' } = param;

    const peerPort = await getPort({ port: store.get('peerPort') as number ?? 0 });
    const peerWsPort = await getPort({ port: store.get('peerWsPort') as number ?? 0 });
    const apiPort = await getPort({ port: store.get('apiPort') as number ?? 0 });
    store.set('peerPort', peerPort);
    store.set('peerWsPort', peerWsPort);
    store.set('apiPort', apiPort);

    const quorumConfig = await getQuorumConfig(`${storagePath}/peerConfig/peer_options.toml`);

    const bootstraps = quorumConfig.bootstraps as string || param.bootstraps.join(',');

    const args = [
      'fullnode',
      '--peername',
      'peer',
      '--listen',
      `/ip4/0.0.0.0/tcp/${peerPort},/ip4/0.0.0.0/tcp/${peerWsPort}/ws`,
      '--apiport',
      `${apiPort}`,
      '--peer',
      bootstraps,
      '--configdir',
      `${storagePath}/peerConfig`,
      '--datadir',
      `${storagePath}/peerData`,
      '--keystoredir',
      `${storagePath}/keystore`,
    ];

    // ensure config dir
    await fs.promises.mkdir(path.join(quorumBaseDir, 'config')).catch((e) => {
      if (e.code === 'EEXIST') {
        return;
      }
      console.error(e);
    });

    state.bootstraps = bootstraps;
    state.storagePath = storagePath;
    state.port = apiPort;

    console.log('spawn quorum: ');
    console.log(state);
    console.log(args);

    quorumLog.log('');
    quorumLog.log('');
    quorumLog.log('');
    quorumLog.log('spawn quorum:');
    quorumLog.log(state);
    quorumLog.log(args);

    const peerProcess = childProcess.spawn(cmd, args, {
      shell: false,
      cwd: quorumBaseDir,
      env: { ...process.env, RUM_KSPASSWD: password },
    });

    peerProcess.on('error', (err) => {
      this.down();
      console.error(err);
    });

    state.process = peerProcess;

    const handleData = (data: string) => {
      const text = String(data);
      quorumLog.log(text);
    };

    peerProcess.stdout.on('data', handleData);
    peerProcess.stderr.on('data', handleData);
    peerProcess.on('exit', () => {
      state.process = null;
    });

    return this.status();
  },
  down() {
    if (!state.up) {
      return this.status();
    }
    console.log('quorum down');
    state.process?.kill();
    state.process = null;
    return this.status();
  },
  logPath() {
    const file = quorumLog.transports.file.getFile();
    const filePath = file.path;
    const inf = parse(filePath);
    const oldPath = join(inf.dir, inf.name + '.old' + inf.ext);

    return [filePath, oldPath];
  },
  exportKey(param: {
    backupPath: string
    storagePath: string
    password: string
  }) {
    console.error('test');
    const { backupPath, storagePath, password } = param;
    const args = [
      '-backup',
      '-peername',
      'peer',
      '-backup-file',
      backupPath,
      '-password',
      password,
      '-configdir',
      `${storagePath}/peerConfig`,
      '-seeddir',
      `${storagePath}/seeds`,
      '-keystoredir',
      `${storagePath}/keystore`,
      '-datadir',
      `${storagePath}/peerData`,
    ];
    const command = [cmd, ...args].join(' ');

    console.log('exportKeyData: ');
    console.log(command);
    console.log(args);

    return new Promise((resovle, reject) => {
      const exportProcess = childProcess.spawn(cmd, args, {
        shell: false,
        cwd: quorumBaseDir,
      });

      exportProcess.on('error', (err) => {
        reject(err);
        console.error(err);
      });

      let logs = '';

      const handleData = (data: string) => {
        const text = String(data);
        quorumLog.log(text);
        logs += data;
      };
      exportProcess.stdout.on('data', handleData);
      exportProcess.stderr.on('data', handleData);
      exportProcess.on('close', (code) => {
        if (code === 0) {
          resovle('success');
        } else {
          reject(new Error(logs));
        }
      });
    });
  },
  importKey(param: {
    backupPath: string
    storagePath: string
    password: string
  }) {
    console.error('test');
    const { backupPath, storagePath, password } = param;
    const args = [
      '-restore',
      '-peername',
      'peer',
      '-backup-file',
      backupPath,
      '-password',
      password,
      '-configdir',
      `${storagePath}/peerConfig`,
      '-seeddir',
      `${storagePath}/seeds`,
      '-keystoredir',
      `${storagePath}/keystore`,
      '-datadir',
      `${storagePath}/peerData`,
    ];
    const command = [cmd, ...args].join(' ');

    console.log('importKeyData: ');
    console.log(command);
    console.log(args);

    return new Promise((resovle, reject) => {
      const importProcess = childProcess.spawn(cmd, args, {
        shell: false,
        cwd: quorumBaseDir,
      });

      importProcess.on('error', (err) => {
        reject(err);
        console.error(err);
      });

      const handleData = (data: string) => {
        const text = String(data);
        quorumLog.log(text);
      };
      importProcess.stdout.on('data', handleData);
      importProcess.stderr.on('data', handleData);
      importProcess.on('close', (code) => {
        if (code === 0) {
          resovle('success');
        } else {
          reject(new Error());
        }
      });
    });
  },
};

export const initQuorum = async () => {
  ipcMain.on('quorum', async (event, arg) => {
    try {
      const result = await actions[arg.action as keyof typeof actions](arg.param);
      event.sender.send('quorum', {
        id: arg.id,
        data: result,
        error: null,
      });
    } catch (err) {
      console.error(err);
      event.sender.send('quorum', {
        id: arg.id,
        data: null,
        error: (err as Error).message,
      });
    }
  });

  await fs.promises.mkdir(quorumBaseDir).catch((e) => {
    if (e.code === 'EEXIST') {
      return;
    }
    console.error(e);
  });
};

async function getQuorumConfig(configPath: string) {
  try {
    const configToml = await fs.promises.readFile(configPath);
    return toml.parse(configToml.toString());
  } catch (err) { }
  return {};
}
