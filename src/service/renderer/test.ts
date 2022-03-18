import assert from './utils/assert';
import sleep from './utils/sleep';
import QuorumSDK from '.';
import { ContentStatus, IDbObjectItem } from './database';

export default {
  async start() {
    const QuorumClient = new QuorumSDK();

    await QuorumClient.up();

    // Node
    {
      await sleep(2000);
      logSection('Node');
      const status = await QuorumClient.Node.status();
      assert(status, 'fetch quorum status');
      const info = await QuorumClient.Node.info();
      assert(info, 'fetch info');
      const network = await QuorumClient.Node.network();
      assert(network, 'fetch network');
    }

    // Group
    {
      logSection('Group');
      const group = await QuorumClient.Group.create({
        group_name: 'test',
        consensus_type: 'poa',
        encryption_type: 'public',
        app_key: 'group_note',
      });
      assert(group, 'create group');
      const groups = await QuorumClient.Group.list() || [];
      assert(groups.length > 0, 'list groups');
      await QuorumClient.Group.leave(group.group_id);
      const groupsAfterLeave = await QuorumClient.Group.list() || [];
      assert(groups.length === groupsAfterLeave.length + 1, 'leaved group confirmed');
    }

    // Object
    {
      logSection('Object');
      const objectId = '1';
      const group = await QuorumClient.Group.create({
        group_name: 'test',
        consensus_type: 'poa',
        encryption_type: 'public',
        app_key: 'group_note',
      });
      const groups = await QuorumClient.Group.list() || [];
      const { user_pubkey } = groups.find(g => g.group_id === group.group_id) || { user_pubkey: '' };
      const object = await QuorumClient.Object.put(user_pubkey, {
        type: 'Add',
        object: {
          id: objectId,
          type: 'Note',
          content: 'test',
        },
        target: {
          id: group.group_id,
          type: 'Group',
        },
      });
      assert(object, 'create object');
      const objects = await QuorumClient.Object.list();
      assert(objects.length > 0, 'list objects');
      const newObject = await QuorumClient.Object.put(user_pubkey, {
        type: 'Add',
        object: {
          id: objectId,
          type: 'Note',
          content: 'test',
        },
        target: {
          id: group.group_id,
          type: 'Group',
        },
      });
      const overwroteObject = await QuorumClient.Object.getByTrxId(object.TrxId);
      assert(newObject && !overwroteObject, 'update object');
      await QuorumClient.Object.delete(group.group_id, object.Content.id);
      const deletedObject = await QuorumClient.Object.getByTrxId(object.TrxId);
      assert(!deletedObject, 'delete object');
      await QuorumClient.Group.leave(group.group_id);
    }
    
    // Object polling
    {
      logSection('Object polling');
      const objectId = '1';
      const group = await QuorumClient.Group.create({
        group_name: 'test',
        consensus_type: 'poa',
        encryption_type: 'public',
        app_key: 'group_note',
      });
      const groups = await QuorumClient.Group.list() || [];
      const { user_pubkey } = groups.find(g => g.group_id === group.group_id) || { user_pubkey: '' };
      const object = await QuorumClient.Object.put(user_pubkey, {
        type: 'Add',
        object: {
          id: objectId,
          type: 'Note',
          content: 'test',
        },
        target: {
          id: group.group_id,
          type: 'Group',
        },
      });
      QuorumClient.Object.startPolling(group.group_id);
      const objects = await (new Promise((resolve) => {
        QuorumClient.Object.onChange(resolve);
      }) as Promise<IDbObjectItem[]>);
      QuorumClient.Object.stopPolling();
      assert(objects.find((o) => o.TrxId === object.TrxId), 'object changed');
      const syncedObject = await QuorumClient.Object.getByTrxId(object.TrxId);
      assert(syncedObject && syncedObject.Status === ContentStatus.synced, 'object synced');
      const trx = await QuorumClient.Object.fetchTrx(group.group_id, object.TrxId);
      assert(trx, 'fetch trx');
      await QuorumClient.Group.leave(group.group_id);
    }

    // Auth
    {
      logSection('Auth');
      const group = await QuorumClient.Group.create({
        group_name: 'test',
        consensus_type: 'poa',
        encryption_type: 'public',
        app_key: 'group_note',
      });
      const groupId = group.group_id;
      const followingRule = await QuorumClient.Auth.getFollowingRule(groupId, 'POST');
      assert(followingRule, 'get following rule');
      const publisher = 'CAISIQOx6+HI0x1Gaosl5YvNfexQD1qJpA8xVeOIh7DL+UmGZw==';
      const addAllowListRet = await QuorumClient.Auth.updateAuthList({
        group_id: groupId,
        type: 'upd_alw_list',
        config: {
          action: 'add',
          pubkey: publisher,
          trx_type: ['POST'],
          memo: '',
        },
      });
      assert(addAllowListRet, 'add allow List');
      const removeAllowListRet = await QuorumClient.Auth.updateAuthList({
        group_id: groupId,
        type: 'upd_alw_list',
        config: {
          action: 'remove',
          pubkey: publisher,
          trx_type: ['POST'],
          memo: '',
        },
      });
      assert(removeAllowListRet, 'remove allow List');
      const updateFollowingRuleRet = await QuorumClient.Auth.updateFollowingRule({
        group_id: groupId,
        type: 'set_trx_auth_mode',
        config: {
          trx_type: 'POST',
          trx_auth_mode: 'FOLLOW_DNY_LIST',
          memo: '',
        },
      });
      assert(updateFollowingRuleRet, 'update following rule to deny mode');
      const addDenyListRet = await QuorumClient.Auth.updateAuthList({
        group_id: groupId,
        type: 'upd_dny_list',
        config: {
          action: 'add',
          pubkey: publisher,
          trx_type: ['POST'],
          memo: '',
        },
      });
      assert(addDenyListRet, 'add allow List');
      const removeDenyListRet = await QuorumClient.Auth.updateAuthList({
        group_id: groupId,
        type: 'upd_dny_list',
        config: {
          action: 'remove',
          pubkey: publisher,
          trx_type: ['POST'],
          memo: '',
        },
      });
      assert(removeDenyListRet, 'remove allow List');
      await QuorumClient.Auth.getAllowList(groupId);
      await QuorumClient.Auth.getDenyList(groupId);
      await QuorumClient.Group.leave(groupId);
    }

    console.log('All tests passed !!');
  }
}

const logSection = (message: string) => {
  console.log(`TESTING: ${message}`)
};