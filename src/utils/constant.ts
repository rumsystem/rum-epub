/** 群组模板类型(用于[group.app_key]) */
export enum GROUP_TEMPLATE_TYPE {
  // TIMELINE = 'group_timeline',
  // POST = 'group_post',
  // NOTE = 'group_note',
  EPUB = 'group_epub',
  EPUB_LINK = 'group_epub_link',
}

/** 群组 config */
export enum GROUP_CONFIG_KEY {
  GROUP_ICON = 'group_icon',
  GROUP_DESC = 'group_desc',
  GROUP_ANNOUNCEMENT = 'group_announcement',
}

export const BOOTSTRAPS = [
  '/ip4/101.42.141.118/tcp/62777/p2p/16Uiu2HAm9uziCEHprbzJoBdG9uktUQSYuFY58eW7o5Dz7rKhRn2j',
  '/ip4/94.23.17.189/tcp/62777/p2p/16Uiu2HAm5waftP3s4oE1EzGF2SyWeK726P5B8BSgFJqSiz6xScGz',
];

export const wsBootstraps = [
  '/ip4/139.155.182.182/tcp/33333/ws/p2p/16Uiu2HAmBUxzcXjCydQTcKgpXvmBZc3paQdTT5j8RXp23M7avi1z',
  '/ip4/94.23.17.189/tcp/10667/ws/p2p/16Uiu2HAmGTcDnhj3KVQUwVx8SGLyKBXQwfAxNayJdEwfsnUYKK4u',
];

export const OBJECT_STATUS_DELETED_LABEL = 'OBJECT_STATUS_DELETED';
