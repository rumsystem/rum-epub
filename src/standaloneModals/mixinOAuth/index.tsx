import React from 'react';
import classNames from 'classnames';
import { runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { createRoot } from 'react-dom/client';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import { BsQuestionCircleFill } from 'react-icons/bs';
import { MdInfo } from 'react-icons/md';

import { getAccessToken, getUserProfile } from '~/apis';
import { Dialog } from '~/components';
import { client_id, getVerifierAndChanllege, getOAuthUrl } from '~/utils/mixinOAuth';
import { ThemeRoot } from '~/utils/theme';
import { lang } from '~/utils';
import { epubService, tooltipService } from '~/service';

export const mixinOAuth = async () => new Promise<string | undefined>((rs) => {
  if (!epubService.state.current.groupId) {
    return;
  }
  const div = document.createElement('div');
  const root = createRoot(div);
  document.body.append(div);
  const unmount = () => {
    root.unmount();
    div.remove();
  };
  root.render(
    (
      <ThemeRoot>
        <MixinOAuth
          rs={(v) => {
            rs(v);
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

const MixinOAuth = observer((props: { rs: (v?: string) => unknown }) => {
  const state = useLocalObservable(() => ({
    open: true,

    verifier: null as null | string,
    challenge: null as null | string,
    oauthUrl: null as null | string,
    webviewLoading: true,
    webview: null as null | HTMLWebViewElement,
  }));

  const handleClose = () => {
    runInAction(() => { state.open = false; });
    props.rs();
  };

  const loadStop = React.useCallback(() => {
    if ((state.webview as any)?.getURL() === state.oauthUrl) {
      runInAction(() => {
        state.webviewLoading = false;
      });
    }
  }, []);

  const handleOauthFailure = () => {
    handleClose();
    tooltipService.show({
      content: lang.mixin.failToFetchMixinProfile,
      type: 'error',
    });
  };

  const redirecting = React.useCallback(async (event: Event) => {
    const currentUrl = (event as Event & {url: string}).url;
    if (currentUrl !== state.oauthUrl) {
      runInAction(() => {
        state.webviewLoading = true;
      });
      const regExp = /code=([^&#]*)/g;
      const code = regExp.exec(currentUrl)?.[1];
      if (code && state.verifier) {
        try {
          const res = await getAccessToken({ client_id, code, code_verifier: state.verifier });
          if (res?.data?.access_token) {
            const res2 = await getUserProfile(res.data.access_token);
            if (res2?.data?.user_id) {
              runInAction(() => { state.open = false; });
              props.rs(res2?.data?.user_id);
            } else {
              handleClose();
            }
          } else {
            handleOauthFailure();
          }
        } catch (e) {
          console.warn(e);
          handleOauthFailure();
        }
      } else {
        handleOauthFailure();
      }
    }
  }, []);

  React.useEffect(() => {
    const { verifier, challenge } = getVerifierAndChanllege();
    const oauthUrl = getOAuthUrl(challenge);
    state.verifier = verifier;
    state.challenge = challenge;
    state.oauthUrl = oauthUrl;
  }, []);

  React.useEffect(() => {
    state.webview?.addEventListener('did-stop-loading', loadStop);
    state.webview?.addEventListener('will-navigate', redirecting);
    return () => {
      state.webview?.removeEventListener('did-stop-loading', loadStop);
      state.webview?.removeEventListener('will-navigate', redirecting);
    };
  }, [state.oauthUrl]);

  return (
    <Dialog
      maxWidth={false}
      open={state.open}
      onClose={handleClose}
    >
      <div className="bg-white rounded-0 text-center p-8">
        <div className="bg-white rounded-0 text-center">
          <div className="py-8 px-14 text-center">
            <div className="text-18 font-bold text-gray-700 flex items-center justify-center">
              {lang.mixin.connectMixin}
              <Tooltip
                enterDelay={200}
                enterNextDelay={200}
                placement="top"
                title={lang.mixin.connectMixinPrivacyTip}
                arrow
              >
                <div>
                  <BsQuestionCircleFill className="text-16 opacity-60 ml-1" />
                </div>
              </Tooltip>
            </div>
            <div className="text-12 mt-2 text-gray-6d">
              {lang.mixin.mixinScanToConnect}
            </div>
            <div className="relative overflow-hidden">
              {state.oauthUrl && (
                <div
                  className={classNames(
                    {
                      hidden: state.webviewLoading,
                    },
                    'w-64 h-64',
                  )}
                >
                  <webview
                    src={state.oauthUrl}
                    ref={(ref) => { state.webview = ref; }}
                    style={{
                      height: '506px',
                      width: '800px',
                      position: 'absolute',
                      top: '-238px',
                      left: '0',
                      marginLeft: `${window.navigator.userAgent.includes('Windows NT') ? '-265px' : '-272px'}`,
                      transform: 'scale(0.88)',
                    }}
                  />
                </div>
              )}
              {state.webviewLoading && (
                <div className="w-64 h-64 flex items-center justify-center">
                  <CircularProgress size={30} />
                </div>
              )}
            </div>
            <div className="flex justify-center mt-2">
              <Button onClick={handleClose}>
                {lang.operations.cancel}
              </Button>
            </div>
            <div className="flex justify-center items-center mt-5 text-gray-400 text-12">
              <span className="flex items-center mr-1">
                <MdInfo className="text-16" />
              </span>
              {lang.mixin.noMixinOnYourPhone}
              <a
                className="text-gray-700 ml-1"
                href="https://mixin.one/messenger"
                target="_blank"
                rel="noopener noreferrer"
              >
                {lang.mixin.toDownload}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
});
