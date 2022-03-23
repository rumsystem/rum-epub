import qs from 'query-string';
import request from '../request';

export enum ContentTypeUrl {
  Object = 'quorum.pb.Object',
  Person = 'quorum.pb.Person',
}

export interface IPostContentResult {
  trx_id: string
}

export type IContentItemBasic = {
  TrxId: string
  Publisher: string
  TypeUrl: string
  TimeStamp: number
} & Record<string, any>;

export interface IContentPayload {
  type: string
  object: any
  target: {
    id: string
    type: string
  }
}

export interface IPerson {
  name: string
  image?: {
    mediaType: string
    content: string
  }
  wallet?: Array<IWalletItem>
}

export interface IProfile {
  name: string
  avatar: string
  mixinUID?: string
}

export interface IProfilePayload {
  type: string
  person: IPerson
  target: {
    id: string
    type: string
  }
}

export interface IWalletItem {
  id: string
  type: string
  name: string
}

export const fetchContents = (
  groupId: string,
  options: {
    num: number
    starttrx?: string
    nonce?: number
    reverse?: boolean
    includestarttrx?: boolean
  },
) => {
  const normalizedOptions = {
    num: options.num,
    starttrx: options.starttrx ?? '',
    nonce: options.nonce ?? 0,
    reverse: options.reverse ?? false,
    includestarttrx: options.includestarttrx ?? false,
  };
  return request(
    `/app/api/v1/group/${groupId}/content?${qs.stringify(normalizedOptions)}`,
    {
      method: 'POST',
      quorum: true,
      body: { senders: [] },
      jwt: true,
    },
  ) as Promise<null | Array<IContentItemBasic>>;
};

export const postContent = (content: IContentPayload) => request('/api/v1/group/content', {
  method: 'POST',
  quorum: true,
  body: content,
  jwt: true,
}) as Promise<IPostContentResult>;

export const updateProfile = (profile: IProfilePayload) => request('/api/v1/group/profile', {
  method: 'POST',
  quorum: true,
  body: profile,
  jwt: true,
}) as Promise<IPostContentResult>;
