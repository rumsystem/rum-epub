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
import { myLibraryState } from '~/standaloneModals/myLibrary/state';
import IconLangLocal from '~/assets/lang_local.svg';
import { exportLog } from './helper';
import { TitleBarMenu } from './TitleBarMenu';

import './index.sass';

interface Props {
  className?: string
}

export const TitleBar = observer((props: Props) => {
  const menuLeft = [
    {
      content: 'Rumbrary',
      children: [
        {
          content: `${lang.titleBar.about} ...`,
          action: () => {
            // TODO: 关于页面
          },
        },
        {
          content: lang.titleBar.checkForUpdate,
          action: () => {
            updateService.checkUpdate();
          },
        },
        {
          content: `${lang.titleBar.manual} ...`,
          action: () => {
            shell.openExternal('https://docs.prsdev.club/#/rum-app/');
          },
        },
        {
          content: `${lang.titleBar.report} ...`,
          action: () => {
            shell.openExternal('https://github.com/noe132/rum-epub/issues');
          },
        },
        {
          content: lang.titleBar.exit,
          action: () => {
            ipcRenderer.send('prepare-quit');
            app.quit();
          },
        },
      ],
    },
    {
      content: lang.titleBar.dev,
      children: [
        {
          content: lang.titleBar.devtools,
          action: () => {
            getCurrentWindow().webContents.toggleDevTools();
          },
        },
        {
          content: `${lang.titleBar.exportLogs} ...`,
          action: () => {
            exportLog();
          },
        },
        {
          content: `${lang.titleBar.clearCache} ...`,
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
          content: `${lang.titleBar.relaunch} ...`,
          action: async () => {
            const result = await dialogService.open({
              content: lang.titleBar.confirmToRelaunch,
            });
            if (result === 'confirm') {
              ipcRenderer.send('prepare-quit');
              app.relaunch();
              app.quit();
            }
          },
        },
      ],
    },
  ].filter(<T extends unknown>(v: false | T): v is T => !!v);
  const menuRight = [
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
      content: (
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
          content: lang.titleBar.editProfile,
          action: () => editProfile(),
        },
        {
          content: lang.titleBar.editWallet,
          action: () => editProfile(),
        },
        !!nodeService.state.nodeInfo.node_publickey && {
          content: lang.titleBar.nodeAndNetwork,
          action: () => {
            nodeInfoModal();
          },
        },
        {
          content: `${lang.titleBar.exportKey} ...`,
          action: exportKeyData,
        },
        {
          content: `${lang.titleBar.importKey} ...`,
          action: importKeyData,
        },
      ].filter(<T extends unknown>(v: T | false): v is T => !!v),
    },
    {
      content: (
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
          content: (<>
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
          content: (<>
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
        <TitleBarMenu items={menuLeft} />
      </div>
      <div className="flex items-stertch">
        <button
          className="px-4 mx-1 cursor-pointer flex items-center focus:bg-gray-4a text-12"
          onClick={() => {
            getCurrentWindow().reload();
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
        {!!nodeService.state.pollingStarted && (
          <button
            className={classNames(
              'text-13 px-3 outline-none',
              !myLibraryState.opened && 'hover:bg-white/20',
              myLibraryState.opened && 'bg-white/30',
            )}
            onClick={myLibrary}
          >
            <div className="text-bright-orange">
              {lang.titleBar.myLib}
            </div>
          </button>
        )}
        {false && <TitleBarMenu items={menuRight} />}
      </div>
    </div>
  </>);
});
