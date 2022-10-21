import path, { join, parse } from 'path';
import fs from 'fs';
import childProcess, { ChildProcess } from 'child_process';
import { app, ipcMain } from 'electron';
import { create } from 'electron-log';
import getPort from 'get-port';
import watch from 'node-watch';
import ElectronStore from 'electron-store';
import toml from 'toml';

const store = new ElectronStore({
  name: 'quorum_port_store',
});

const quorumLog = create('quorum');
quorumLog.transports.file.fileName = 'quorum.log';
quorumLog.transports.console = (() => {}) as any;
quorumLog.transports.ipc = null;

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = !isDevelopment;
const quorumBaseDir = path.join(
  isProduction ? process.resourcesPath : app.getAppPath(),
  'quorum_bin',
);
const certDir = path.join(quorumBaseDir, 'certs');
const certPath = path.join(quorumBaseDir, 'certs/server.crt');
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
  type: '',
  userInputCert: '',
  quorumUpdating: false,
  quorumUpdated: false,
  quorumUpdatePromise: null as null | Promise<unknown>,

  get up() {
    return !!this.process;
  },
};

const actions = {
  status() {
    return {
      up: state.up,
      bootstraps: state.bootstraps,
      storagePath: state.storagePath,
      port: state.port,
      cert: state.cert,
      quorumUpdating: state.quorumUpdating,
    };
  },
  async up(param: any) {
    if (state.up) {
      return this.status();
    }
    if (state.quorumUpdatePromise) {
      await state.quorumUpdatePromise;
    }
    const { storagePath, password = '' } = param;

    const peerPort = await getPort({ port: store.get('peerPort') as number ?? 0 });
    const peerWsPort = await getPort({ port: store.get('peerWsPort') as number ?? 0 });
    const apiPort = await getPort({ port: store.get('apiPort') as number ?? 0 });
    store.set('peerPort', peerPort);
    store.set('peerWsPort', peerWsPort);
    store.set('apiPort', apiPort);

    const quorumConfig = await getQuorumConfig(`${storagePath}/peerConfig/peer_options.toml`);

    const bootstraps = quorumConfig.bootstraps || param.bootstraps.join(',');

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

    state.type = param.type;
    state.userInputCert = '';
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
  set_cert(param: any) {
    state.userInputCert = param.cert ?? '';
  },
  log_path() {
    const file = quorumLog.transports.file.getFile();
    const filePath = file.path;
    const inf = parse(filePath);
    const oldPath = join(inf.dir, inf.name + '.old' + inf.ext);

    return [filePath, oldPath];
  },
  exportKey(param: any) {
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
  exportKeyWasm(param: any) {
    console.error('test');
    const { backupPath, storagePath, password } = param;
    const args = [
      '-backup-to-wasm',
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

    console.log('exportKeyWasmData: ');
    console.log(command);
    console.log(args);

    return new Promise((resovle, reject) => {
      const exportProcess = childProcess.spawn(cmd, args, {
        cwd: quorumBaseDir,
      });

      exportProcess.on('error', (err) => {
        reject(err);
        console.error(err);
      });

      const handleData = (data: string) => {
        const text = String(data);
        quorumLog.log(text);
      };
      exportProcess.stdout.on('data', handleData);
      exportProcess.stderr.on('data', handleData);
      exportProcess.on('close', (code) => {
        if (code === 0) {
          resovle('success');
        } else {
          reject(new Error());
        }
      });
    });
  },
  importKey(param: any) {
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
  importKeyWasm(param: any) {
    console.error('test');
    const { backupPath, storagePath, password } = param;
    const args = [
      '-restore-from-wasm',
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

export const updateQuorum = async () => {
  if (isDevelopment) {
    return;
  }
  if (state.up) {
    console.error(new Error('can\'t update quorum while it\'s up'));
    return;
  }
  if (state.quorumUpdating) {
    return;
  }
  console.log('spawn quorum update: ');
  state.quorumUpdating = true;
  await new Promise<void>((rs) => {
    childProcess.exec(
      `${cmd} -update`,
      { cwd: quorumBaseDir },
      (err, stdout, stderr) => {
        if (err) {
          console.log('update failed!');
        }
        console.log('update stdout:');
        console.log(err, stdout.toString());
        console.log('update stderr:');
        console.log(err, stderr.toString());
        rs();
      },
    );
  });
  state.quorumUpdating = false;
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

  await fs.promises.mkdir(certDir).catch((e) => {
    if (e.code === 'EEXIST') {
      return;
    }
    console.error(e);
  });

  state.quorumUpdatePromise = updateQuorum().finally(() => {
    state.quorumUpdatePromise = null;
    state.quorumUpdated = true;
  });

  await state.quorumUpdatePromise;

  const loadCert = async () => {
    try {
      const buf = await fs.promises.readFile(certPath);
      state.cert = buf.toString();
      console.log('load cert');
    } catch (e) {
      state.cert = '';
    }
  };

  watch(
    certDir,
    { recursive: true },
    loadCert,
  );
  loadCert();
};

async function getQuorumConfig(configPath: string) {
  try {
    const configToml = await fs.promises.readFile(configPath);
    return toml.parse(configToml.toString());
  } catch (err) {}
  return {};
}
