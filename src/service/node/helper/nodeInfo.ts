
import { join } from 'path';
import { promises as fs } from 'fs';
import { array, nullType, string, TypeOf, union } from 'io-ts';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { ipcRenderer } from 'electron';
import { enumType, fallback, fallbackInterface } from '~/utils';
import { identity, pipe } from 'fp-ts/lib/function';

const CONFIG_FILE_NAME = 'nodeinfo.json';
export enum NODE_TYPE {
  UNKNOWN = 'UNKNOWN',
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

const nodeType = enumType<NODE_TYPE>(NODE_TYPE, 'NODE_TYPE');

export const externalNode = fallbackInterface({
  host: fallback(string, '127.0.0.1'),
  port: fallback(string, ''),
  jwt: fallback(string, ''),
  cert: fallback(string, ''),
});

export const internalNode = fallbackInterface({
  dir: fallback(string, ''),
  password: fallback(string, ''),
});

export const nodeInfoStore = fallbackInterface({
  type: fallback(nodeType, NODE_TYPE.UNKNOWN),
  internalNode: fallback(union([internalNode, nullType]), null),
  externalNode: fallback(union([externalNode, nullType]), null),
  historyExtenralNodes: fallback(array(externalNode), []),
});

export type NodeInfoStore = TypeOf<typeof nodeInfoStore>;

const readConfigFile = TE.tryCatch(async () => {
  const userDataPath = await ipcRenderer.invoke('getUserDataPath');
  const configPath = join(userDataPath, CONFIG_FILE_NAME);
  const file = await fs.readFile(configPath);
  return file.toString();
}, () => 'get config fail' as const);

const parseConfig = (content: string) => E.tryCatch(
  () => JSON.parse(content),
  () => 'parse config fail' as const,
);

const validateConfig = (object: unknown) => pipe(
  nodeInfoStore.decode(object),
  E.mapLeft(() => 'validate config fail' as const),
);

export const getConfig = pipe(
  readConfigFile,
  TE.chainW((v) => TE.fromEither(parseConfig(v))),
  TE.chainW((v) => TE.fromEither(validateConfig(v))),
  TE.matchW(
    () => nodeInfoStore.defaultData,
    identity,
  ),
);

export const writeConfig = (config: NodeInfoStore) => TE.tryCatch(
  async () => {
    const userDataPath = await ipcRenderer.invoke('getUserDataPath');
    const configPath = join(userDataPath, CONFIG_FILE_NAME);
    await fs.writeFile(configPath, JSON.stringify(config));
  },
  identity,
)();
