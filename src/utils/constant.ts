/** 群组模板类型(用于[group.app_key]) */
export enum GROUP_TEMPLATE_TYPE {
  // TIMELINE = 'group_timeline',
  // POST = 'group_post',
  // NOTE = 'group_note',
  EPUB = 'group_epub',
}

/** 群组 config */
export enum GROUP_CONFIG_KEY {
  GROUP_ICON = 'group_icon',
  GROUP_DESC = 'group_desc',
  GROUP_ANNOUNCEMENT = 'group_announcement',
}

export const BOOTSTRAPS = [
  '/ip4/94.23.17.189/tcp/10666/p2p/16Uiu2HAmGTcDnhj3KVQUwVx8SGLyKBXQwfAxNayJdEwfsnUYKK4u',
  '/ip4/132.145.109.63/tcp/10666/p2p/16Uiu2HAmTovb8kAJiYK8saskzz7cRQhb45NRK5AsbtdmYsLfD3RM',
];

export const wsBootstraps = [
  '/ip4/139.155.182.182/tcp/33333/ws/p2p/16Uiu2HAmBUxzcXjCydQTcKgpXvmBZc3paQdTT5j8RXp23M7avi1z',
  '/ip4/94.23.17.189/tcp/10667/ws/p2p/16Uiu2HAmGTcDnhj3KVQUwVx8SGLyKBXQwfAxNayJdEwfsnUYKK4u',
];

export const OBJECT_STATUS_DELETED_LABEL = 'OBJECT_STATUS_DELETED';
