import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { ipcRenderer } from 'electron';
import { getCurrentWindow, shell, app } from '@electron/remote';
import { Tooltip } from '@mui/material';
import { Check, ChevronRight } from '@mui/icons-material';

import { lang } from '~/utils';
import {
  i18n,
  AllLanguages,
  nodeService,
  dbService,
  dialogService,
  updateService,
  profileService,
} from '~/service';
import {
  nodeInfoModal,
  editProfile,
  importKeyData,
  exportKeyData,
  myLibrary,
} from '~/standaloneModals';
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
          text: lang.titleBar.about,
          action: () => {
            // TODO: 关于页面
          },
        },
        {
          text: lang.titleBar.checkForUpdate,
          action: () => {
            updateService.checkUpdate();
          },
        },
        {
          text: lang.titleBar.manual,
          action: () => {
            if (process.env.IS_ELECTRON) {
              shell.openExternal('https://docs.prsdev.club/#/rum-app/');
            } else {
              window.open('https://docs.prsdev.club/#/rum-app/');
            }
          },
        },
        {
          text: lang.titleBar.report,
          action: () => {
            if (process.env.IS_ELECTRON) {
              shell.openExternal('https://github.com/noe132/rum-epub/issues');
            } else {
              window.open('https://github.com/noe132/rum-epub/issues');
            }
          },
        },
        {
          text: lang.titleBar.exit,
          action: () => {
            ipcRenderer.send('prepare-quit');
            app.quit();
          },
        },
      ],
    },
    {
      text: lang.titleBar.dev,
      children: [
        {
          text: lang.titleBar.devtools,
          action: () => {
            getCurrentWindow().webContents.toggleDevTools();
          },
        },
        {
          text: lang.titleBar.exportLogs,
          action: () => {
            exportLog();
          },
        },
        {
          text: lang.titleBar.clearCache,
          action: async () => {
            const result = await dialogService.open({
              content: lang.titleBar.confirmToClearCacheData,
            });
            if (result === 'confirm') {
              dbService.db.delete();
              window.location.reload();
            }
          },
        },
        {
          text: lang.titleBar.relaunch,
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
    // {
    //   // TODO: 发现
    //   text: (
    //     <div className="text-bright-orange">
    //       发现内容
    //     </div>
    //   ),
    //   action: () => myLibrary(),
    // },
    !!nodeService.state.pollingStarted && {
      text: (
        <div className="text-bright-orange">
          {lang.titleBar.myLib}
        </div>
      ),
      action: () => myLibrary(),
    },
    !!nodeService.state.pollingStarted && {
      text: (
        <div className="flex flex-center gap-x-2">
          <div
            className="w-8 h-8 rounded-full bg-contain"
            style={{
              backgroundImage: `url("${profileService.state.profileImage}")`,
            }}
          />
          {profileService.state.profileName}
          <ChevronRight className="rotate-90 text-bright-orange -mx-1" />
        </div>
      ),
      children: [
        {
          text: lang.titleBar.editProfile,
          action: () => editProfile(),
        },
        {
          text: lang.titleBar.editWallet,
          action: () => editProfile(),
        },
        !!nodeService.state.nodeInfo.node_publickey && {
          text: lang.titleBar.nodeAndNetwork,
          action: () => {
            nodeInfoModal();
          },
        },
        {
          text: lang.titleBar.exportKey,
          action: exportKeyData,
        },
        {
          text: lang.titleBar.importKey,
          action: importKeyData,
        },
      ].filter(<T extends unknown>(v: T | false): v is T => !!v),
    },
    {
      text: (
        <Tooltip
          placement="bottom"
          title={lang.titleBar.switchLang}
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
          {lang.node.refresh}
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
