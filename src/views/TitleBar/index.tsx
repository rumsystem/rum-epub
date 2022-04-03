import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { getCurrentWindow, shell, app } from '@electron/remote';
import { MenuItem } from '@mui/material';

import { lang } from '~/utils/lang';
import {
  i18n,
  AllLanguages,
  nodeService,
  dbService,
  dialogService,
  updateService,
} from '~/service';
import { nodeInfoModal } from '~/standaloneModals/nodeInfo';

import IconLangLocal from 'assets/lang_local.svg';
import { TitleBarItem } from './TitleBarItem';

import './index.sass';

interface Props {
  className?: string
}

interface MenuItem {
  text: string
  action?: () => unknown
  children?: Array<MenuItem>
  hidden?: boolean
  icon?: string
  checked?: boolean
}

export const TitleBar = observer((props: Props) => {
  // const { modalStore, nodeStore } = useStore();
  // const cleanLocalData = useCleanLocalData();

  const menuLeft: Array<MenuItem> = [
    {
      text: lang.refresh,
      action: () => {
        if (!process.env.IS_ELECTRON) {
          window.location.reload();
        } else {
          getCurrentWindow().reload();
        }
      },
    },
    {
      text: lang.checkForUpdate,
      action: () => {
        updateService.checkUpdate();
      },
    },
    {
      text: lang.dev,
      children: [
        {
          text: lang.devtools,
          action: () => {
            if (!process.env.IS_ELECTRON) {
              // TODO:
              // eslint-disable-next-line no-alert
              alert('TODO');
              return;
            }
            getCurrentWindow().webContents.toggleDevTools();
          },
        },
        // {
        //   text: lang.exportLogs,
        //   action: () => {
        //     if (!process.env.IS_ELECTRON) {
        //       // TODO:
        //       // eslint-disable-next-line no-alert
        //       alert('TODO');
        //       return;
        //     }
        //     getCurrentWindow().webContents.send('export-logs');
        //   },
        // },
        {
          text: lang.clearCache,
          action: async () => {
            const result = await dialogService.open({
              content: lang.confirmToClearCacheData,
            });
            if (result === 'confirm') {
              dbService.db.delete();
              window.location.reload();
            }
          },
        },
        {
          text: lang.relaunch,
          action: () => {
            ipcRenderer.send('prepare-quit');
            app.relaunch();
            app.quit();
          },
        },
      ],
    },
    {
      text: lang.help,
      children: [
        {
          text: lang.manual,
          action: () => {
            if (process.env.IS_ELECTRON) {
              shell.openExternal('https://docs.prsdev.club/#/rum-app/');
            } else {
              window.open('https://docs.prsdev.club/#/rum-app/');
            }
          },
        },
        {
          text: lang.report,
          action: () => {
            if (process.env.IS_ELECTRON) {
              shell.openExternal('https://github.com/rumsystem/rum-app/issues');
            } else {
              window.open('https://github.com/rumsystem/rum-app/issues');
            }
          },
        },
      ],
    },
  ].filter(<T extends unknown>(v: false | T): v is T => !!v);
  const menuRight: Array<MenuItem> = [
    !!nodeService.state.nodeInfo.node_publickey && {
      text: lang.nodeAndNetwork,
      action: () => {
        nodeInfoModal();
      },
    },
    // nodeStore.connected && {
    //   text: lang.accountAndSettings,
    //   children: [
    //     {
    //       text: lang.myGroup,
    //       action: () => {
    //         // TODO:
    //         // myGroup();
    //       },
    //     },
    //     {
    //       text: lang.changeFontSize,
    //       action: () => {
    //         // TODO:
    //         // changeFontSize();
    //       },
    //     },
    //     {
    //       text: lang.exportKey,
    //       action: () => {
    //         // TODO:
    //         // exportKeyData();
    //       },
    //       hidden: !nodeStore.connected,
    //     },
    //     {
    //       text: lang.importKey,
    //       action: () => {
    //         // TODO:
    //         // importKeyData();
    //       },
    //     },
    //   ],
    // },
    {
      text: lang.switchLang,
      icon: IconLangLocal,
      children: [
        {
          text: 'English',
          checked: i18n.state.lang === 'en',
          classNames: 'ml-2 pl-5',
          action: () => {
            i18n.switchLang('en' as AllLanguages);
          },
        },
        {
          text: '简体中文',
          checked: i18n.state.lang === 'cn',
          classNames: 'ml-2 pl-5',
          action: () => {
            i18n.switchLang('cn' as AllLanguages);
          },
        },
      ],
    },
  ].filter(<T extends unknown>(v: false | T): v is T => !!v);

  return (<>
    <div
      className={classNames(
        props.className,
        'app-title-bar-placeholder',
      )}
    />

    <div className="menu-bar fixed left-0 right-0 bg-black text-white flex justify-between items-stretch px-2">
      <div className="flex items-stertch">
        {menuLeft.map((menu, i) => (
          <TitleBarItem menu={menu} key={'menu-left-' + i} />
        ))}
      </div>
      <div className="flex items-stertch">
        {/* {nodeStore.connected && nodeStore.mode === 'EXTERNAL' && (
          <div className="mr-6 cursor-pointer flex items-center text-white opacity-70 text-12 w-[auto] mt-[2px]">
            <div className="w-2 h-2 bg-emerald-300 rounded-full mr-2" />
            {lang.externalMode}
          </div>
        )} */}
        {menuRight.map((menu, i) => (
          <TitleBarItem menu={menu} key={'menu-rigth-' + i} />
        ))}
      </div>
    </div>
  </>);
});
