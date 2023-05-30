import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, Dialog, MenuItem, Select, SelectChangeEvent } from '@mui/material';

import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { bookService, nodeService, tooltipService } from '~/service';
import { GroupIcon } from '~/components';
import { lang } from '~/utils';
import { joinGroup } from '../joinGroup';
import { createGroup } from '../createGroup';

export interface Props {
  groupId: string
}

export const GroupLink = observer((props: { destroy: () => unknown } & Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    selectedGroupId: '',
    get notLinkedGroup() {
      const linkedGroups = Object.values(nodeService.state.groupLink);
      return nodeService.state.groups
        .filter((v) => v.app_key === GROUP_TEMPLATE_TYPE.EPUB_LINK)
        .filter((v) => !linkedGroups.includes(v.group_id));
    },
  }));

  const group = nodeService.state.groupMap[props.groupId];

  const handleClose = action(() => {
    state.open = false;
    setTimeout(props.destroy, 2000);
  });

  const handleCreateGroup = async () => {
    handleClose();
    const groupId = await createGroup({
      type: 'link_group',
      name: `${group?.group_name} link`,
    });
    if (groupId) {
      doLink(groupId);
    }
  };

  const handleJoinGroup = async () => {
    const groupId = await joinGroup({});
    if (!groupId) {
      return;
    }
    const group = nodeService.state.groupMap[groupId];
    if (group?.app_key !== GROUP_TEMPLATE_TYPE.EPUB_LINK) {
      return;
    }
    doLink(groupId);
  };

  const handleLink = () => {
    const groupId = state.selectedGroupId;
    if (groupId) {
      doLink(groupId);
      handleClose();
    }
  };

  const doLink = (linkGroupId: string) => {
    tooltipService.show({
      content: lang.linkGroup.linked,
    });
    runInAction(() => {
      nodeService.state.groupLink[props.groupId] = linkGroupId;
      bookService.openBook({
        groupId: props.groupId,
        linkGroupId,
      });
    });
  };

  return (
    <Dialog open={state.open} onClose={handleClose}>
      <div className="flex-col gap-4 bg-white rounded-0 p-6">
        <div className="text-18 font-bold text-gray-700 text-center pb-2">
          {lang.linkGroup.link}
        </div>

        <div className="flex item-scenter gap-4">
          <GroupIcon
            className="rounded-lg shadow-1"
            width={32}
            height={32}
            fontSize={16}
            groupId={props.groupId}
          />
          <div className="flex flex-center text-gray-4a">
            {group?.group_name}
          </div>
          <div className="flex flex-center text-gray-4a">
            {group?.group_id}
          </div>
        </div>

        {lang.linkGroup.selectFromExistedSeednet}
        <Select
          className="w-[500px]"
          MenuProps={{
            className: 'w-[500px]',
          }}
          value={state.selectedGroupId}
          renderValue={(v) => {
            const group = nodeService.state.groups.find((u) => u.group_id === v);
            if (!v || !group) {
              return (
                <div className="flex items-center text-black/40 text-14 h-8">
                  {lang.linkGroup.seednetSelectPlaceholder}
                </div>
              );
            }
            return (
              <div className="flex items-center gap-2 text-14">
                <GroupIcon
                  className="rounded-lg shadow-1"
                  width={32}
                  height={32}
                  fontSize={16}
                  groupId={group.group_id}
                />
                <div className="text-black/40 truncate">
                  <span className="text-black/80 mr-2">
                    {group.group_name}
                  </span>
                  <span className="text-black/40">
                    {group.group_id}
                  </span>
                </div>
              </div>
            );
          }}
          displayEmpty
          onChange={action((e: SelectChangeEvent) => { state.selectedGroupId = e.target.value; })}
          size="small"
        >
          {!state.notLinkedGroup.length && (
            <MenuItem className="text-14" value="">
              {lang.linkGroup.noSeednet}
            </MenuItem>
          )}

          {state.notLinkedGroup.map((v) => (
            <MenuItem
              className="gap-2 text-14"
              key={v.group_id}
              value={v.group_id}
            >
              <GroupIcon
                className="rounded-lg shadow-1"
                width={32}
                height={32}
                fontSize={16}
                groupId={v.group_id}
              />
              <div className="text-black/40 truncate">
                <span className="text-black/80 mr-2">
                  {v.group_name}
                </span>
                <span className="text-black/40">
                  {v.group_id}
                </span>
              </div>
            </MenuItem>
          ))}
        </Select>

        <div className="flex gap-4">
          <Button onClick={handleCreateGroup}>
            {lang.linkGroup.createSeednet}
          </Button>
          <Button onClick={handleJoinGroup}>
            {lang.linkGroup.joinSeednet}
          </Button>
          <div className="flex-1" />
          <Button
            onClick={handleLink}
            disabled={!state.selectedGroupId}
          >
            {lang.linkGroup.link}
          </Button>
        </div>
      </div>
    </Dialog>
  );
});
