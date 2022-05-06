import React from 'react';
import { action, reaction } from 'mobx';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';

import { lang } from '~/utils';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';

import { nodeService } from '~/service';
import IconFold from '~/assets/fold.svg';
import GroupItem from './GroupItem';
import { sidebarService } from './service';
import Toolbar from './Toolbar';

interface Props {
  className?: string
}

export default observer((props: Props) => {
  const state = useLocalObservable(() => ({
    mode: 'recent-open' as 'recent-open' | 'recent-add',
    groupTypeFilter: 'all' as 'all' | GROUP_TEMPLATE_TYPE,
    search: '',

    order: [] as Array<string>,
    /** ordered by last open */
    get orderedGroups() {
      return [
        ...this.order
          .map((v) => nodeService.state.groupMap[v])
          .filter(<T extends unknown>(v: T | undefined): v is T => !!v),
        ...nodeService.state.groups.filter((v) => !nodeService.state.groupOrder.includes(v.group_id)),
      ];
    },
  }));

  React.useEffect(() => reaction(
    () => state.mode,
    action(() => {
      state.order = [...nodeService.state.groupOrder];
    }),
    { fireImmediately: true },
  ), []);

  return (
    <div
      className={classNames(
        'sidebar-box relative',
        props.className,
      )}
    >
      <div
        className={classNames(
          'sidebar-toggle flex justify-center items-center h-15',
          'absolute right-0 translate-x-full -translate-y-10 top-1/2',
          'bg-white z-10 rounded-r-xl cursor-pointer',
          'w-[20px]',
        )}
        style={{
          boxShadow: '0 1px 6px 0 rgba(0, 0, 0, 0.16)',
        }}
        onClick={sidebarService.toggleSidebar}
      >
        <img
          className={classNames(
            !sidebarService.state.collapsed && 'rotate-180',
          )}
          width="8"
          src={IconFold}
          alt=""
        />
      </div>

      <div
        className={classNames(
          'sidebar w-[280px] relative flex-col h-full z-20 bg-white',
          sidebarService.state.collapsed && 'hidden',
        )}
        style={{
          boxShadow: '3px 0 6px 0 rgba(0, 0, 0, 0.16)',
        }}
      >
        <Toolbar
          groupTypeFilter={state.groupTypeFilter}
          setGroupTypeFilter={(value) => {
            state.groupTypeFilter = value;
          }}
          searchText={state.search}
          setSearchText={(value) => {
            state.search = value;
          }}
        />

        {/* {!state.searchText && (
          <ListTypeSwitcher
            listType={state.listType}
            setListType={(listType) => {
              state.listType = listType;
              localStorage.setItem(LIST_TYPE_STORAGE_KEY, listType);
            }}
          />
        )} */}
        <div className="flex">
          {['recent-open', 'recent-add'].map((v) => (
            <button className="flex-1 py-2 text-14" key={v}>
              {v === 'recent-open' && '最近打开'}
              {v === 'recent-add' && '最近添加'}
            </button>
          ))}
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
