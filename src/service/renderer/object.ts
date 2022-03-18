import request from './utils/request';
import { IContent, ContentStatus, IDbObjectItem } from './database';
import type { IStore } from '.';
import { OBJECT_STATUS_DELETED_LABEL } from './utils/constant';
import sleep from './utils/sleep';
import electronStore from './utils/electronStore';
import qs from 'query-string';

export enum ContentTypeUrl {
  Object = 'quorum.pb.Object',
}

export interface IPostContentResult {
  trx_id: string
}

export interface IPutPayload {
  type: string
  object: IContent
  target: {
    id: string
    type: string
  }
}

export interface IContentItem {
  TrxId: string
  Publisher: string
  TypeUrl: string
  Content: IContent
}

export interface IFetchContentsOptions {
  num: number
  starttrx?: string
  reverse?: boolean
  senders?: string[]
}

export interface ITrx {
  TrxId: string
  GroupId: string
  SenderPubkey: string
  Data: string
  TimeStamp: number
  Version: string
  Expired: number
  SenderSign: string
}

type IOnChange = (objects: IDbObjectItem[]) => void

export default class _Object {

  store: IStore

  polling: boolean

  onChangeSubs: Array<IOnChange>

  constructor(store: IStore) {
    this.store = store;
    this.polling = false;
    this.onChangeSubs = [];
  }

  get(id: string) {
    return this.store.db.objects.get({
      'Content.id': id
    });
  }

  getByTrxId(trxId: string) {
    return this.store.db.objects.get({
      TrxId: trxId
    });
  }

  list() {
    return this.store.db.objects.toArray();
  }

  async put(publisher: string, payload: IPutPayload) {
    const res = await (request('/api/v1/group/content', {
      method: 'POST',
      origin: this.store.apiOrigin,
      body: payload,
    }) as Promise<IPostContentResult>);
    const existObject = await this.get(payload.object.id);
    if (existObject) {
      await this.store.db.objects.where({ 'Content.id': payload.object.id }).delete();
    }
    await this.store.db.objects.add({
      GroupId: payload.target.id,
      TrxId: res.trx_id,
      Publisher: publisher,
      Content: payload.object,
      TypeUrl: ContentTypeUrl.Object,
      TimeStamp: Date.now() * 1000000,
      Status: ContentStatus.syncing,
    });
    return this.get(payload.object.id) as Promise<IDbObjectItem>;
  }

  async delete(groupId: string, id: string) {
    const payload: IPutPayload = {
      type: 'Add',
      object: {
        id,
        type: 'Note',
        content: OBJECT_STATUS_DELETED_LABEL,
      },
      target: {
        id: groupId,
        type: 'Group',
      },
    }
    await (request('/api/v1/group/content', {
      method: 'POST',
      origin: this.store.apiOrigin,
      body: payload,
    }) as Promise<IPostContentResult>);
    await this.store.db.objects.where({ 'Content.id': id }).delete();
  }

  onChange(onChange: IOnChange) {
    this.onChangeSubs.push(onChange);
  }

  startPolling(groupId: string) {
    this.polling = true;
    (async () => {
      const store = electronStore.get();
      const GROUP_START_TRX_KEY = `${groupId}_startTrx`;
      let startTrx = store.get(GROUP_START_TRX_KEY) as string;
      while (this.polling) {
        const contents: Array<IContentItem> = await this.fetchContents(groupId, {
          num: 100,
          starttrx: startTrx
        })
        if (contents.length > 0) {
          const changedObjects: IDbObjectItem[] = [];
          for (const content of contents) {
            const changedObject = await this.handleContent(groupId, content);
            if (changedObject) {
              changedObjects.push(changedObject);
            }
          }
          if (changedObjects.length > 0) {
            for (const onChangeSub of this.onChangeSubs) {
              onChangeSub(changedObjects);
            }
          }
          const lastContent = contents[contents.length - 1];
          startTrx = lastContent.TrxId;
          store.set(GROUP_START_TRX_KEY, startTrx);
        }
        await sleep(2000);
      }
    })();
  }

  stopPolling() {
    this.polling = false;
  }

  async handleContent(groupId: string, item: IContentItem) {
    const existTrxObject = await this.getByTrxId(item.TrxId);
    if (existTrxObject && existTrxObject.Status === ContentStatus.syncing) {
      await this.store.db.objects.where({ TrxId: item.TrxId }).modify({ Status: ContentStatus.synced });
      return {
        ...existTrxObject,
        Status: ContentStatus.synced
      };
    }
    const existIdObject = await this.get(item.Content.id);
    if (existIdObject) {
      await this.store.db.objects.where({ 'Content.id': item.Content.id }).delete();
      if (item.Content.content === OBJECT_STATUS_DELETED_LABEL) {
        return null;
      }
    }
    await this.store.db.objects.add({
      GroupId: groupId,
      TrxId: item.TrxId,
      Publisher: item.Publisher,
      Content: item.Content,
      TypeUrl: item.TypeUrl,
      TimeStamp: Date.now() * 1000000,
      Status: ContentStatus.synced,
    });
    return null;
  }


  async fetchContents(groupId: string, options: IFetchContentsOptions) {
    const { senders = [] } = options;
    delete options.senders;
    const contents: Array<IContentItem> = await request(
      `/app/api/v1/group/${groupId}/content?${qs.stringify(options)}`,
      {
        method: 'POST',
        body: { senders },
        origin: this.store.apiOrigin,
      },
    ) || [];
    return contents;
  }

  fetchTrx(GroupId: string, TrxId: string) {
    return request(`/api/v1/trx/${GroupId}/${TrxId}`, {
      origin: this.store.apiOrigin,
    }) as Promise<ITrx>;
  }
}
