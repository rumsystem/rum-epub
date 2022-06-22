import React from 'react';
import { action } from 'mobx';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { MdClose } from 'react-icons/md';
import { Input, MenuItem, MenuList, Popover, Tooltip } from '@mui/material';

import { lang } from '~/utils';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { nodeService } from '~/service';
import { createGroup, joinGroup } from '~/standaloneModals';
import IconFold from '~/assets/fold.svg?react';
import IconSearchAllSeed from '~/assets/icon_search_all_seed.svg';
import IconAddSeedMenu from '~/assets/add_seed_menu.svg';
import IconAddseed from '~/assets/icon_addseed.svg';
import IconAddanything from '~/assets/icon_addanything.svg';
import IconSeedNetInvisible from '~/assets/icon_seednet_invisible.svg?icon';
import IconSeedNetVisible from '~/assets/icon_seednet_visible.svg?icon';
import ListUlIcon from 'boxicons/svg/regular/bx-list-ul.svg?fill-icon';
import GridAltIcon from 'boxicons/svg/regular/bx-grid-alt.svg?fill-icon';

import { sidebarService } from './service';
import { SidebarGroupBookList } from './SidebarGroupBookList';

interface Props {
  className?: string
}

export default observer((props: Props) => {
  const state = useLocalObservable(() => ({
    sortMode: 'recent-open' as 'recent-open' | 'recent-add',
    viewMode: 'list' as 'list' | 'grid',
    booksOnly: false,
    groupTypeFilter: 'all' as 'all' | GROUP_TEMPLATE_TYPE,
    search: '',

    menu: false,
    filterMenu: false,
    searchMode: false,
  }));

  const menuButton = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleMenuClick = action(() => { state.menu = true; });
  const handleMenuClose = action(() => { state.menu = false; });
  const handleOpenSearchMode = action(() => {
    state.searchMode = true;
    setTimeout(() => {
      inputRef.current?.focus();
    });
  });
  const handleCloseSearchMode = action(() => {
    state.searchMode = false;
    state.search = '';
  });

  return (<>
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
        <div className="relative">
          <div
            className={classNames(
              sidebarService.state.collapsed && 'hidden',
              'sidebar w-[280px] relative flex flex-col h-full z-20 bg-white',
            )}
          >
            <div className="flex items-center justify-between h-[70px]">
              {!state.searchMode && (<>
                <div className="flex border divide-x border-gray-f2 divide-gray-f2 rounded ml-4">
                  <Tooltip title="列表模式">
                    <button
                      className={classNames(
                        'flex flex-center w-6 h-6',
                        state.viewMode !== 'list' && 'bg-gray-f2 text-gray-af',
                      )}
                      onClick={action(() => { state.viewMode = 'list'; })}
                    >
                      <ListUlIcon className="text-16" />
                    </button>
                  </Tooltip>
                  <Tooltip title="网格模式">
                    <button
                      className={classNames(
                        'flex flex-center w-6 h-6',
                        state.viewMode !== 'grid' && 'bg-gray-f2 text-gray-af',
                      )}
                      onClick={action(() => { state.viewMode = 'grid'; })}
                    >
                      <GridAltIcon className="text-14" />
                    </button>
                  </Tooltip>
                </div>
                <Tooltip title="显示/隐藏种子网络">
                  <button
                    className={classNames(
                      'flex flex-center w-[25px] h-[25px] ml-2 border border-gray-f2 rounded',
                      state.booksOnly && 'bg-gray-f2',
                    )}
                    onClick={action(() => { state.booksOnly = !state.booksOnly; })}
                  >
                    {state.booksOnly && <IconSeedNetInvisible className="text-16" />}
                    {!state.booksOnly && <IconSeedNetVisible className="text-16" />}
                  </button>
                </Tooltip>
                <div className="flex-1" />
                <div className="flex items-center text-gray-1e mr-2">
                  <div
                    className="mr-4 cursor-pointer"
                    onClick={handleOpenSearchMode}
                  >
                    <img src={IconSearchAllSeed} alt="" width="22" height="22" />
                  </div>

                  <div
                    className="mr-2 cursor-pointer"
                    onClick={handleMenuClick}
                    ref={menuButton}
                    data-test-id="sidebar-plus-button"
                  >
                    <img src={IconAddSeedMenu} alt="" width="26" height="26" />
                  </div>
                </div>
              </>)}

              {state.searchMode && (<>
                <img className="ml-3" src={IconSearchAllSeed} alt="" width="22" height="22" />
                <Input
                  inputRef={inputRef}
                  className="mt-0 flex-1 ml-3 mr-1 px-px"
                  value={state.search}
                  onChange={action((e) => { state.search = e.target.value; })}
                />
                <div className="p-2 cursor-pointer mr-1" onClick={handleCloseSearchMode}>
                  <MdClose className="text-16" />
                </div>
              </>)}
            </div>
          </div>
        </div>

        <div className="flex relative -top-2 z-30 px-4">
          <div className="border flex flex-1 rounded">
            {(['recent-open', 'recent-add'] as const).map((v) => (
              <button
                className={classNames(
                  'flex-1 py-[2px] text-12 leading-relaxed',
                  state.sortMode !== v && 'bg-gray-ec text-gray-bd',
                )}
                key={v}
                onClick={action(() => { state.sortMode = v; })}
              >
                {v === 'recent-open' && '最近打开'}
                {v === 'recent-add' && '最近添加'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarGroupBookList
            groupSortMode={state.sortMode}
            viewMode={state.viewMode}
            booksOnly={state.booksOnly}
            search={state.search}
          />

          {nodeService.state.groups.length === 0 && (
            <div className="animate-fade-in pt-20 text-gray-400 opacity-80 text-center">
              {state.search ? lang.noSeedNetSearchResult : lang.noTypeGroups}
            </div>
          )}
        </div>
      </div>
    </div>

    <Popover
      open={state.menu}
      onClose={handleMenuClose}
      anchorEl={menuButton.current}
      PaperProps={{
        className: 'bg-gray-33 text-white font-medium mt-2',
        square: true,
        elevation: 2,
      }}
      anchorOrigin={{
        horizontal: 'center',
        vertical: 'bottom',
      }}
      transformOrigin={{
        horizontal: 'center',
        vertical: 'top',
      }}
    >
      <MenuList>
        <MenuItem
          className="py-3 px-6 hover:bg-gray-4a"
          onClick={() => {
            handleMenuClose();
            joinGroup();
          }}
        >
          <img
            className="text-14 mr-4"
            src={IconAddseed}
            alt=""
          />
          <span className="text-16">添加内容种子</span>
        </MenuItem>
        <MenuItem
          className="py-3 px-6 hover:bg-gray-4a"
          onClick={() => {
            handleMenuClose();
            createGroup();
          }}
          data-test-id="sidebar-menu-item-create-group"
        >
          <img
            className="text-14 mr-4"
            src={IconAddanything}
            alt=""
          />
          <span className="text-16">创建种子</span>
        </MenuItem>
      </MenuList>
    </Popover>
  </>);
});
