
import { join } from 'path';
import { promises as fs } from 'fs';
import { record, string, TypeOf } from 'io-ts';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { ipcRenderer } from 'electron';
import { fallback } from '~/utils';
import { identity, pipe } from 'fp-ts/lib/function';

const CONFIG_FILE_NAME = 'grouplink.json';
export const groupLink = fallback(record(string, string), () => ({}));

export type GroupLinkStore = TypeOf<typeof groupLink>;

const readConfigFile = TE.tryCatch(async () => {
  const userDataPath = await ipcRenderer.invoke('getUserDataPath');
  const configPath = join(userDataPath, CONFIG_FILE_NAME);
  const file = await fs.readFile(configPath);
  return file.toString();
}, () => 'get group link config fail' as const);

const parseConfig = (content: string) => E.tryCatch(
  () => JSON.parse(content),
  () => 'parse group link config fail' as const,
);

const validateConfig = (object: unknown) => pipe(
  groupLink.decode(object),
  E.mapLeft(() => 'validate group link config fail' as const),
);

export const getGroupLinkConfig = pipe(
  readConfigFile,
  TE.chainW((v) => TE.fromEither(parseConfig(v))),
  TE.chainW((v) => TE.fromEither(validateConfig(v))),
  TE.matchW(
    () => groupLink.defaultData,
    identity,
  ),
);

export const writeGroupLinkConfig = (config: GroupLinkStore) => TE.tryCatch(
  async () => {
    const userDataPath = await ipcRenderer.invoke('getUserDataPath');
    const configPath = join(userDataPath, CONFIG_FILE_NAME);
    await fs.writeFile(configPath, JSON.stringify(config));
  },
  identity,
)();
