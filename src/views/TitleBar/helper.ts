import { createWriteStream, promises as fs } from 'fs';
import { basename, join, parse } from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';
import { ipcRenderer } from 'electron';
import { dialog } from '@electron/remote';
import { transports } from 'electron-log';
import { pack } from 'tar-stream';
import { format } from 'date-fns';

import * as Quorum from '~/service/quorum/helper';
import { tooltipService } from '~/service/tooltip';
import { lang } from '~/utils';

export const exportLog = async () => {
  try {
    const date = format(new Date(), 'yyyy-MM-dd-hh-mm-ss');
    const file = await dialog.showSaveDialog({
      defaultPath: `log-${date}.tar.gz`,
    });
    if (file.canceled || !file.filePath) {
      return;
    }

    const rendererLogFile = transports.file.getFile();
    const rendererLogFilePath = rendererLogFile.path;
    const inf = parse(rendererLogFilePath);
    const rendererOldogFilePath = join(inf.dir, inf.name + '.old' + inf.ext);
    const [mainLogFilePath, mainOldLogFilePath] = await ipcRenderer.invoke('get-main-log-path');
    const result = await Quorum.getLogPath();
    const [quorumLogFilePath, quorumOldLogFilePath] = result.data;

    const items = await Promise.all([
      rendererLogFilePath,
      rendererOldogFilePath,
      mainLogFilePath,
      mainOldLogFilePath,
      quorumLogFilePath,
      quorumOldLogFilePath,
    ].map(async (v) => {
      const fileName = basename(v);
      try {
        await fs.stat(v);
      } catch (e) {
        return null;
      }
      const file = await fs.readFile(v);
      return [fileName, file] as const;
    }));

    const p = pack();

    items.filter(<T>(v: T | null): v is T => !!v).forEach((v) => {
      p.entry({ name: v[0] }, v[1]);
    });

    p.finalize();
    const writeStream = createWriteStream(file.filePath);
    const gzip = createGzip();
    pipeline(p, gzip, writeStream, (err) => {
      if (err) {
        console.error(err);
        tooltipService.show({
          content: lang.somethingWrong,
          type: 'error',
        });
      }
    });
  } catch (e) {
    console.error(e);
    tooltipService.show({
      content: lang.somethingWrong,
      type: 'error',
    });
    console.error(e);
  }
};
