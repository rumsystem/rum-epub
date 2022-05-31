import React from 'react';
import { action, reaction } from 'mobx';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import escapeStringRegexp from 'escape-string-regexp';

import { lang } from '~/utils';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { nodeService } from '~/service';
import IconFold from '~/assets/fold.svg?react';

import GroupItem from './GroupItem';
import { sidebarService } from './service';
import Toolbar from './Toolbar';

interface Props {
  className?: string
}

type GroupSortMode = 'recent-open' | 'recent-add';

export default observer((props: Props) => {
  const state = useLocalObservable(() => ({
    mode: 'recent-open' as GroupSortMode,
    groupTypeFilter: 'all' as 'all' | GROUP_TEMPLATE_TYPE,
    search: '',

    clickOrder: [] as Array<string>,
    get orderedGroups() {
      const orderArr = state.mode === 'recent-add'
        ? nodeService.state.groupJoinOrder
        : state.clickOrder;
      const reg = this.search ? new RegExp(escapeStringRegexp(this.search)) : null;
      return [
        ...orderArr
          .map((v) => nodeService.state.groupMap[v])
          .filter(<T extends unknown>(v: T | undefined): v is T => !!v),
        ...nodeService.state.groups.filter((v) => !orderArr.includes(v.group_id)),
      ].filter((v) => !reg || reg.test(v.group_name));
    },
  }));

  React.useEffect(() => reaction(
    () => state.mode,
    action(() => {
      state.clickOrder = [...nodeService.state.groupOrder];
    }),
    { fireImmediately: true },
  ), []);

  return (
    <div className={classNames('sidebar-box relative', props.className)}>
      <div
        className={classNames(
          'sidebar-toggle flex-col justify-center items-center gap-y-2 py-4',
          'absolute right-0 translate-x-full -translate-y-1/2 -mt-4 top-1/2',
          'z-10 rounded-r-xl cursor-pointer',
          'w-[22px] min-h-[60px]',
          sidebarService.state.collapsed && 'text-white bg-black',
          !sidebarService.state.collapsed && 'text-black bg-white',
        )}
        style={{ boxShadow: '0 1px 6px 0 rgba(0, 0, 0, 0.16)' }}
        onClick={sidebarService.toggleSidebar}
      >
        <IconFold
          className={classNames(!sidebarService.state.collapsed && 'rotate-180')}
        />
        {sidebarService.state.collapsed && (
          <div className="leading-tight">
            最<br />近<br />阅<br />读
          </div>
        )}
      </div>

      <div
        className={classNames(
          'sidebar w-[280px] relative flex-col h-full z-20 bg-white',
          sidebarService.state.collapsed && 'hidden',
        )}
        style={{ boxShadow: '3px 0 6px 0 rgba(0, 0, 0, 0.16)' }}
      >
        <Toolbar
          groupTypeFilter={state.groupTypeFilter}
          setGroupTypeFilter={action((value) => { state.groupTypeFilter = value; })}
          searchText={state.search}
          setSearchText={action((value) => { state.search = value; })}
        />

        <div className="flex relative -top-2 z-30 px-2">
          <div className="border flex flex-1 rounded">
            {(['recent-open', 'recent-add'] as const).map((v) => (
              <button
                className={classNames(
                  'flex-1 py-[2px] text-12 leading-relaxed',
                  state.mode !== v && 'bg-gray-ec text-gray-bd',
                )}
                key={v}
                onClick={action(() => { state.mode = v; })}
              >
                {v === 'recent-open' && '最近打开'}
                {v === 'recent-add' && '最近添加'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {state.orderedGroups.map((v) => (
            <GroupItem
              group={v}
              highlight=""
              key={v.group_id}
            />
          ))}

          {nodeService.state.groups.length === 0 && (
            <div className="animate-fade-in pt-20 text-gray-400 opacity-80 text-center">
              {state.search ? lang.noSeedNetSearchResult : lang.noTypeGroups}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
