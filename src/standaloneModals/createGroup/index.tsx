import React from 'react';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { createRoot } from 'react-dom/client';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  Button,
  CircularProgress,
  Fade,
  FormControl,
  InputLabel,
  OutlinedInput,
  Tooltip,
} from '@mui/material';
import { ChevronLeft, Check } from '@mui/icons-material';

import NotebookIcon from '~/assets/template/template_icon_notebook.svg?react';
import PermissionWriteIcon from '~/assets/permission/write.svg?react';
import PermissionReadOnlyIcon from '~/assets/permission/readonly.svg?react';
import SeedNoopenIcon from '~/assets/icon_seed_noopen.svg?react';

import { dialogService, epubService, escService, nodeService, tooltipService } from '~/service';
import { lang, runLoading } from '~/utils';
import { GROUP_CONFIG_KEY, GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { ThemeRoot } from '~/utils/theme';
import { AuthType, changeGroupConfig, setChainConfig } from '~/apis';

import { StepBox } from './StepBox';

export const createGroup = async () => new Promise<void>((rs) => {
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
        <CreateGroup
          rs={() => {
            rs();
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

interface Props {
  rs: () => unknown
}

const TOTAL_STEPS = 2;

const CreateGroup = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,
    step: 0,

    name: '',
    desc: '',
    icon: '',
    type: GROUP_TEMPLATE_TYPE.EPUB,
    authType: 'FOLLOW_ALW_LIST' as AuthType,

    consensusType: 'poa',
    encryptionType: 'public',

    creating: false,
    dispose: escService.noop,
  }));

  const scrollBox = React.useRef<HTMLDivElement>(null);

  const handleChangeType = action((type: GROUP_TEMPLATE_TYPE) => {
    state.type = type;
  });

  const handleChangeAuthType = action((type: AuthType) => {
    state.authType = type;
  });

  const handlePrevStep = action(() => {
    if (state.step === 0) { return; }
    state.step -= 1;
  });

  const handleNextStep = action(() => {
    if (state.step < TOTAL_STEPS - 1) {
      state.step += 1;
    } else {
      handleConfirm();
    }
  });

  const handleConfirm = async () => {
    if (state.creating) { return; }
    if (!state.name) {
      tooltipService.show({
        content: lang.require(lang.group.groupName),
        type: 'error',
      });
      return;
    }

    const confirmResult = await dialogService.open({
      title: lang.createGroup.confirmCreateEpubSeednet,
      content: (
        <div className="text-center">
          <p className="mb-4">《{state.name}》</p>
          <p className="text-14">
            {lang.createGroup.confirmCreateTip}
          </p>
        </div>
      ),
      cancel: lang.createGroup.backAndEdit,
      confirm: lang.createGroup.confirmCreate,
    });
    if (confirmResult === 'cancel') { return; }

    const createGroupResult = await runLoading(
      (l) => { state.creating = l; },
      TE.tryCatch(
        () => nodeService.createGroup({
          group_name: state.name,
          consensus_type: state.consensusType,
          encryption_type: state.encryptionType,
          app_key: state.type,
        }),
        (v) => v as Error,
      ),
    );

    if (E.isLeft(createGroupResult)) {
      tooltipService.show({
        content: lang.somethingWrong,
        type: 'error',
      });
      return;
    }

    tooltipService.show({
      content: lang.createGroup.created,
      timeout: 1000,
    });
    const groupId = createGroupResult.right.group_id;
    epubService.openBook(groupId);
    handleClose();

    const changeAuthTypeResult = TE.tryCatch(
      async () => {
        if (state.authType === 'FOLLOW_ALW_LIST') {
          await setChainConfig({
            group_id: groupId,
            type: 'set_trx_auth_mode',
            config: {
              trx_type: 'POST',
              trx_auth_mode: 'follow_alw_list',
              memo: '',
            },
          });
          await setChainConfig({
            group_id: groupId,
            type: 'upd_alw_list',
            config: {
              action: 'add',
              pubkey: createGroupResult.right.user_pubkey,
              trx_type: ['POST'],
              memo: '',
            },
          });
        }
      },
      (v) => v as Error,
    )();
    const groupConfigResult = TE.tryCatch(
      async () => {
        // it take several second to sync
        await Promise.all([
          state.icon && changeGroupConfig({
            group_id: groupId,
            action: state.icon ? 'add' : 'del',
            name: GROUP_CONFIG_KEY.GROUP_ICON,
            type: 'string',
            value: state.icon ? state.icon : 'holder',
          }),
          state.desc && changeGroupConfig({
            group_id: groupId,
            action: state.desc ? 'add' : 'del',
            name: GROUP_CONFIG_KEY.GROUP_DESC,
            type: 'string',
            value: state.desc ? state.desc : 'holder',
          }),
        ]);
      },
      (v) => v as Error,
    )();

    changeAuthTypeResult.then((v) => {
      if (E.isLeft(v)) {
        tooltipService.show({
          content: lang.somethingWrong,
          type: 'error',
        });
      }
    });

    groupConfigResult.then((v) => {
      if (E.isLeft(v)) {
        tooltipService.show({
          content: lang.somethingWrong,
          type: 'error',
        });
      }
    });
  };

  const handleClose = action(() => {
    props.rs();
    state.open = false;
    state.dispose();
  });

  React.useEffect(() => reaction(
    () => state.step,
    () => {
      if (scrollBox.current) {
        scrollBox.current.scrollTop = 0;
      }
    },
  ), []);

  React.useEffect(() => {
    runInAction(() => {
      state.open = true;
    });
    state.dispose = escService.add(handleClose);
  }, []);

  return (
    <Fade
      in={state.open}
      timeout={300}
      mountOnEnter
      unmountOnExit
    >
      <div className="flex flex-col items-stretch fixed inset-0 top-[40px] bg-gray-f7 z-50">
        <div className="flex flex-none gap-x-10 px-10 h-17 items-center bg-white">
          <button
            className="flex flex-center text-16"
            onClick={handleClose}
          >
            <ChevronLeft className="text-producer-blue" />
            {lang.operations.back}
          </button>
          <div className="text-20 font-bold">
            {lang.createGroup.createGroup}
          </div>
        </div>

        <div className="flex-col flex-center flex-1 h-0 p-10">
          <div
            className="flex-col justify-center overflow-auto w-[800px] flex-1"
            ref={scrollBox}
          >
            <div className="flex-col items-stretch bg-white px-22 py-10 max-h-[650px] flex-1 text-gray-4a">
              {state.step === 0 && (<>
                <div className="text-18 font-medium -ml-9">
                  {lang.createGroup.selectTemplate}
                </div>

                <div className="mt-6 text-14 text-gray-4a">
                  {lang.createGroup.selectTemplateTip}
                </div>

                <div className="flex justify-center gap-x-8 mt-12">
                  {([
                    ['placeholder', null, SeedNoopenIcon],
                    ['epub', GROUP_TEMPLATE_TYPE.EPUB, NotebookIcon],
                    ['placeholder', null, SeedNoopenIcon],
                  ] as const).map(([name, type, GroupIcon], i) => (
                    <div
                      className={classNames(
                        'relative flex flex-col flex-center w-45 px-3 py-4 border rounded-md select-none',
                        name === 'placeholder' && 'border-gray-af cursor-pointer',
                        name !== 'placeholder' && 'border-black',
                        state.type === type && 'bg-gray-f7',
                      )}
                      data-test-id={`group-type-${type}`}
                      onClick={() => type && handleChangeType(type)}
                      key={i}
                    >
                      <GroupIcon
                        className="w-14 text-black"
                        style={{
                          strokeWidth: 2,
                        }}
                      />
                      {name === 'placeholder' && (
                        <div className="mt-2 text-16 text-gray-9c">
                          {lang.createGroup.NA}
                        </div>
                      )}
                      {name === 'epub' && (<>
                        <div className="text-16 text-black">
                          {lang.createGroup.book}
                        </div>
                        <div className="text-14 text-gray-6f">
                          Epub
                        </div>
                      </>)}

                      {state.type === type && (
                        <div
                          className="absolute right-[-1px] top-[-1px] w-10 h-10"
                          style={{
                            backgroundImage: 'linear-gradient(-135deg, black 50%, transparent 50%)',
                          }}
                        >
                          <Check className="absolute right-[3px] top-[2px] text-gray-f7 text-18" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-14 mt-7 px-5 hidden">
                  {state.type === GROUP_TEMPLATE_TYPE.EPUB && (
                    <div className="animate-fade-in text-center">
                      {/* TODO: epub 种子网络描述 */}
                      epub desc
                      <br />
                      epub desc
                    </div>
                  )}
                </div>
              </>)}

              {state.step === 9 && (<>
                <div className="text-18 font-medium -ml-9">
                  {lang.createGroup.permissionTitle}
                </div>

                <div className="mt-6 text-14 text-gray-4a">
                  {lang.createGroup.permissionTip}
                </div>

                <div className="flex justify-center gap-x-8 mt-12">
                  {([
                    ['FOLLOW_DNY_LIST', lang.createGroup.write, PermissionWriteIcon],
                    // ['comment', lang.createGroup.comment, PermissionCommentIcon],
                    ['FOLLOW_ALW_LIST', lang.createGroup.readonly, PermissionReadOnlyIcon],
                  ] as const).map(([authType, desc, Icon], i) => (
                    <div
                      className={classNames(
                        'relative flex flex-col items-center w-45 p-5 pt-3 border border-black rounded-md select-none cursor-pointer',
                        state.authType === authType && 'bg-gray-f7',
                        // type === 'post' && 'pointer-events-none opacity-60',
                      )}
                      data-test-id={`group-type-${authType}`}
                      onClick={() => handleChangeAuthType(authType)}
                      key={i}
                    >
                      <Icon />
                      <div className="text-16 text-black">
                        {desc}
                      </div>

                      {state.authType === authType && (
                        <div
                          className="absolute right-[-1px] top-[-1px] w-10 h-10"
                          style={{
                            backgroundImage: 'linear-gradient(-135deg, black 50%, transparent 50%)',
                          }}
                        >
                          <Check className="absolute right-[3px] top-[2px] text-gray-f7 text-18" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-14 text-gray-64 mt-8 px-10">
                  {state.authType === 'FOLLOW_DNY_LIST' && (
                    <div className="">
                      {lang.createGroup.writeDesc.map((v, i) => (
                        <div className={i !== 0 ? 'mt-2' : ''} key={i}>
                          {v}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* {state.authType === 'comment' && (
                    <div className="">
                      {lang.createGroup.commentDesc.map((v, i) => (
                        <div className={i !== 0 ? 'mt-2' : ''} key={i}>
                          {v}
                        </div>
                      ))}
                    </div>
                  )} */}
                  {state.authType === 'FOLLOW_ALW_LIST' && (
                    <div className="">
                      <div>
                        {lang.createGroup.readonlyDesc1(
                          <Tooltip
                            classes={{
                              tooltip: 'bg-white text-black shadow-1',
                            }}
                            title={lang.createGroup.readonlyTip}
                          >
                            <span className="text-producer-blue">
                              (?)
                            </span>
                          </Tooltip>,
                        )}
                      </div>
                      <br />
                      <br />
                      {lang.createGroup.readonlyDesc2}
                    </div>
                  )}
                </div>
              </>)}

              {state.step === 1 && (<>
                <div className="text-18 font-medium -ml-9">
                  {lang.createGroup.groupBasicInfo}
                </div>

                <div className="flex flex-center mt-4">
                  {/* <div className="w-20 h-20 rounded-sm border border-gray-400 relative overflow-hidden bg-gray-c4">
                    <ImageEditor
                      className="opacity-0 !absolute !m-0 -inset-px"
                      width={200}
                      placeholderWidth={90}
                      editorPlaceholderWidth={200}
                      imageUrl={state.icon}
                      getImageUrl={action((url: string) => {
                        state.icon = url;
                      })}
                    />
                    <GroupIcon
                      width={80}
                      height={80}
                      fontSize={48}
                      groupName={state.name}
                      groupIcon={state.icon}
                    />
                    <div
                      className={classNames(
                        'w-5 h-5 -mb-px -mr-px absolute right-0 bottom-0 rounded-sm',
                        'bg-gray-4a bg-opacity-40 text-white flex flex-center',
                      )}
                    >
                      <MdEdit />
                    </div>
                  </div> */}
                </div>

                <FormControl className="mt-8 w-full" variant="outlined">
                  <InputLabel>{lang.createGroup.name}</InputLabel>
                  <OutlinedInput
                    label={lang.createGroup.name}
                    value={state.name}
                    onChange={action((e) => { state.name = e.target.value; })}
                    spellCheck={false}
                    data-test-id="create-group-name-input"
                  />
                </FormControl>

                <FormControl className="mt-8 w-full" variant="outlined">
                  <InputLabel>{lang.createGroup.desc}</InputLabel>
                  <OutlinedInput
                    label={lang.createGroup.desc}
                    value={state.desc}
                    onChange={action((e) => { state.desc = e.target.value; })}
                    spellCheck={false}
                    multiline
                    minRows={3}
                    maxRows={3}
                  />
                </FormControl>
              </>)}

              <div className="flex-1 py-5" />

              <div className="grid grid-cols-3 grid-center my-8">
                <Button
                  className={classNames(
                    'rounded border border-solid border-gray-70 bg-gray-f7 text-16 py-[6px] px-7',
                    state.step === 0 && 'pointer-events-none opacity-0',
                  )}
                  color="inherit"
                  onClick={handlePrevStep}
                  disabled={state.creating}
                >
                  {lang.operations.prevStep}
                </Button>
                <StepBox
                  className=""
                  total={TOTAL_STEPS}
                  value={state.step}
                />
                <Button
                  className="rounded text-16 py-[6px] px-7"
                  onClick={handleNextStep}
                  disabled={state.creating}
                >
                  {state.step === TOTAL_STEPS - 1 && lang.createGroup.createGroup}
                  {state.creating && (
                    <CircularProgress
                      className="ml-2 -mr-2 text-inherit"
                      size={16}
                    />
                  )}
                  {state.step !== TOTAL_STEPS - 1 && lang.operations.nextStep}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fade>
  );
});
