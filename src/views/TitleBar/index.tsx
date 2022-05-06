import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { getCurrentWindow, shell, app } from '@electron/remote';
import { Tooltip } from '@mui/material';
import { Check } from '@mui/icons-material';

import { lang } from '~/utils';
import {
  i18n,
  AllLanguages,
  nodeService,
  dbService,
  dialogService,
  updateService,
} from '~/service';
import { nodeInfoModal } from '~/standaloneModals/nodeInfo';
import IconLangLocal from '~/assets/lang_local.svg';
import { TitleBarItem, TitleBarMenuItem } from './TitleBarItem';
import { exportLog } from './helper';

import './index.sass';

interface Props {
  className?: string
}

export const TitleBar = observer((props: Props) => {
  const menuLeft: Array<TitleBarMenuItem> = [
    {
      text: 'Rum Epub',
      children: [
        {
          text: '关于 Rum Epub',
          action: () => {
            // TODO:
          },
        },
        {
          text: lang.checkForUpdate,
          action: () => {
            updateService.checkUpdate();
          },
        },
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
              shell.openExternal('https://github.com/noe132/rum-epub/issues');
            } else {
              window.open('https://github.com/noe132/rum-epub/issues');
            }
          },
        },
        {
          text: '退出',
          action: () => {
            ipcRenderer.send('prepare-quit');
            app.quit();
          },
        },
      ],
    },
    {
      text: lang.dev,
      children: [
        {
          text: lang.devtools,
          action: () => {
            getCurrentWindow().webContents.toggleDevTools();
          },
        },
        {
          text: lang.exportLogs,
          action: () => {
            exportLog();
          },
        },
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
  ].filter(<T extends unknown>(v: false | T): v is T => !!v);
  const menuRight: Array<TitleBarMenuItem> = [
    !!nodeService.state.nodeInfo.node_publickey && {
      text: lang.nodeAndNetwork,
      action: () => {
        nodeInfoModal();
      },
    },
    {
      text: (
        <Tooltip
          placement="bottom"
          title={lang.switchLang}
        >
          <img src={IconLangLocal} alt="" />
        </Tooltip>
      ),
      icon: IconLangLocal,
      children: [
        {
          text: (<>
            <Check
              className={classNames(
                '-ml-2',
                i18n.state.lang !== 'en' && 'opacity-0',
              )}
              style={{ color: '#34d399' }}
            />
            English
          </>),
          action: () => {
            i18n.switchLang('en' as AllLanguages);
          },
        },
        {
          text: (<>
            <Check
              className={classNames(
                '-ml-2',
                i18n.state.lang !== 'cn' && 'opacity-0',
              )}
              style={{ color: '#34d399' }}
            />
            简体中文
          </>),
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
        <button
          className="px-4 mx-1 cursor-pointer flex items-center focus:bg-gray-4a text-12"
          onClick={() => {
            if (!process.env.IS_ELECTRON) {
              window.location.reload();
            } else {
              getCurrentWindow().reload();
            }
          }}
        >
          {lang.refresh}
        </button>
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
