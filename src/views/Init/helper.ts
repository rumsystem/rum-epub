
import { format } from 'date-fns';
import { ipcRenderer } from 'electron';
import * as E from 'fp-ts/Either';
import { promises as fs } from 'fs';
import * as path from 'path';
import { lang } from '~/utils';

const isRumFolder = (p: string) => {
  const folderName = path.basename(p);
  return /^rum(-.+)?$/.test(folderName);
};

const isEmptyFolder = async (p: string) => {
  const exist = await (async () => {
    try {
      const stat = await fs.stat(p);
      return { right: stat };
    } catch (e) {
      return { left: e as NodeJS.ErrnoException };
    }
  })();
  const files = await (async () => {
    try {
      const f = await fs.readdir(p);
      return { right: f };
    } catch (e) {
      return { left: e as NodeJS.ErrnoException };
    }
  })();
  const notExist = !!exist.left && exist.left.code === 'ENOENT';
  const isEmpty = !!files.right && !files.right.length;
  return notExist || isEmpty;
};

const isRumDataFolder = async (p: string) => {
  const stat = await (async () => {
    try {
      const stat = await fs.stat(p);
      return { right: stat };
    } catch (e) {
      return { left: e as NodeJS.ErrnoException };
    }
  })();

  if (stat.left || !stat.right.isDirectory()) {
    return false;
  }
  const files = await fs.readdir(p);
  return files.some((v) => v === 'peerConfig');
};

const includeKeystoreFolder = async (p: string) => {
  const files = await fs.readdir(p);
  return files.some((v) => v === 'keystore');
};

const selectePath = async () => ipcRenderer.invoke('selectDir');

export const selectRumFolder = async (type: 'new' | 'exist'): Promise<E.Either<string | null, string>> => {
  const selectedPath = await selectePath();
  if (!selectedPath) {
    return E.left(null);
  }

  if (type === 'new') {
    const date = format(new Date(), 'yyyyMMdd');
    const paths = [
      selectedPath,
      path.join(selectedPath, 'rum'),
      path.join(selectedPath, `rum-${date}`),
    ];

    for (const p of paths) {
      if (isRumFolder(p) && await isEmptyFolder(p)) {
        return E.right(p);
      }
    }

    const files = await fs.readdir(selectedPath);
    // find the max index in `rum-${date}-${index}`
    const maxIndex = files
      .map((v) => new RegExp(`rum-${date}-(\\d+?)$`).exec(v))
      .filter(<T extends unknown>(v: T | null): v is T => !!v)
      .map((v) => Number(v[1]))
      .reduce((p, c) => Math.max(p, c), 0);
    const newPath = path.join(selectedPath, `rum-${date}-${maxIndex + 1}`);
    await fs.mkdir(newPath, { recursive: true });
    return E.right(newPath);
  }

  if (type === 'exist') {
    const paths = [
      selectedPath,
      path.join(selectedPath, 'rum'),
    ];

    let noKeystoreFolder = false;

    for (const p of paths) {
      if (await isRumDataFolder(p)) {
        if (await includeKeystoreFolder(p)) {
          return E.right(p);
        }
        noKeystoreFolder = true;
      }
    }

    return E.left(noKeystoreFolder ? lang.keyStoreNotExist : lang.nodeDataNotExist);
  }

  return E.left(lang.somethingWrong);
};
