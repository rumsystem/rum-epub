import React from 'react';
import { unmountComponentAtNode, render } from 'react-dom';
import classNames from 'classnames';
import { action, reaction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  Fade,
  FormControl,
  InputLabel,
  OutlinedInput,
  Radio,
} from '@mui/material';

import Button from '~/components/Button';

import NotebookIcon from 'assets/template/template_icon_notebook.svg?react';

import { nodeService } from '~/service/node';
import { tooltipService } from '~/service/tooltip';

import { lang } from '~/utils/lang';
import { runLoading } from '~/utils';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { ThemeRoot } from '~/utils/theme';

export const createGroup = async () => new Promise<void>((rs) => {
  const div = document.createElement('div');
  document.body.append(div);
  const unmount = () => {
    unmountComponentAtNode(div);
    div.remove();
  };
  render(
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
    div,
  );
});

interface Props {
  rs: () => unknown
}

const CreateGroup = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,
    step: 0,

    type: GROUP_TEMPLATE_TYPE.EPUB,
    name: '',
    desc: '',
    consensusType: 'poa',
    encryptionType: 'public',

    creating: false,
  }));
  const scrollBox = React.useRef<HTMLDivElement>(null);

  const handleTypeChange = action((type: GROUP_TEMPLATE_TYPE) => {
    state.type = type;
  });

  const handleConfirm = () => {
    if (!state.name) {
      tooltipService.show({
        content: lang.require(lang.groupName),
        type: 'error',
      });
      return;
    }

    if (state.creating) {
      return;
    }

    runLoading(
      (l) => { state.creating = l; },
      async () => {
        try {
          const group = await nodeService.createGroup({
            group_name: state.name,
            consensus_type: state.consensusType,
            encryption_type: state.encryptionType,
            app_key: state.type,
          });
          tooltipService.show({
            content: lang.created,
            timeout: 1000,
          });
          nodeService.changeActiveGroup(group);
          handleClose();
        } catch (e) {
          console.error(e);
          tooltipService.show({
            content: lang.somethingWrong,
            type: 'error',
          });
        }
      },
    );
  };

  const handleClose = action(() => {
    props.rs();
    state.open = false;
  });

  React.useEffect(() => reaction(
    () => state.step,
    () => {
      if (scrollBox.current) {
        scrollBox.current.scrollTop = 0;
      }
    },
  ), []);

  React.useEffect(action(() => {
    state.open = true;
  }), []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      handleConfirm();
    }
  };

  return (
    <Fade
      in={state.open}
      timeout={500}
      mountOnEnter
      unmountOnExit
    >
      <div className="flex flex-col items-stretch fixed inset-0 top-[40px] bg-gray-f7 z-50">
        <div
          className="flex flex-col items-center overflow-auto flex-1"
          ref={scrollBox}
        >
          <div className="w-[800px] flex-1 text-gray-6d my-8 px-10 py-6 bg-white">
            {state.step === 0 && (<>
              <div className="text-18 font-medium">
                {lang.createGroup} - {lang.chooseTemplate}
              </div>

              <div className="mt-3 text-12 text-gray-9c">
                {lang.groupTypeDesc}
              </div>

              <div className="flex justify-center gap-x-20 mt-16 mb-6">
                {([
                  // TODO:
                  ['epub', GROUP_TEMPLATE_TYPE.EPUB, NotebookIcon],
                ] as const).map(([name, type, GroupIcon], i) => (
                  <div
                    className={classNames(
                      'flex flex-col items-center select-none cursor-pointer px-4',
                      // type === 'post' && 'pointer-events-none opacity-60',
                    )}
                    data-test-id={`group-type-${type}`}
                    onClick={() => handleTypeChange(type)}
                    key={i}
                  >
                    <div className="relative">
                      &nbsp;
                      <div className="absolute text-black whitespace-nowrap text-16 left-1/2 -translate-x-1/2 top-0">
                        {name}
                      </div>
                    </div>
                    <div className="mt-2 h-14 flex flex-center">
                      <GroupIcon
                        className="w-14 text-black"
                        style={{
                          strokeWidth: 2,
                        }}
                      />
                    </div>
                    <div className="text-16 flex items-center">
                      <Radio
                        disableRipple
                        color="primary"
                        size="small"
                        checked={state.type === type}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-14 px-5">
                {/* {state.type === GROUP_TEMPLATE_TYPE.TIMELINE && (
                  <div className="animate-fade-in text-center">
                    {lang.snsDesc}
                  </div>
                )}
                {state.type === GROUP_TEMPLATE_TYPE.POST && (
                  <div className="animate-fade-in text-center">
                    {lang.forumDesc}
                  </div>
                )}
                {state.type === GROUP_TEMPLATE_TYPE.NOTE && (
                  <div className="animate-fade-in text-center">
                    {lang.noteDesc}
                  </div>
                )} */}
                {state.type === GROUP_TEMPLATE_TYPE.EPUB && (
                  <div className="animate-fade-in text-center">
                    epub desc
                  </div>
                )}
              </div>

              <FormControl className="mt-8 w-full" variant="outlined">
                <InputLabel>{lang.groupName}</InputLabel>
                <OutlinedInput
                  label={lang.groupName}
                  value={state.name}
                  onChange={action((e) => { state.name = e.target.value; })}
                  spellCheck={false}
                  onKeyDown={handleInputKeyDown}
                  data-test-id="create-group-name-input"
                />
              </FormControl>

              {/* <div className="flex gap-x-6 mt-6">
                <FormControl className="flex-1" variant="outlined">
                  <InputLabel>共识类型</InputLabel>
                  <Select
                    value={state.consensusType}
                    onChange={action((e) => { state.consensusType = e.target.value as string; })}
                    label="共识类型"
                  >
                    <MenuItem value="poa">poa</MenuItem>
                    <MenuItem value="pos">pos</MenuItem>
                    <MenuItem value="pos">pow</MenuItem>
                  </Select>
                </FormControl>

                <FormControl className="flex-1" variant="outlined">
                  <InputLabel>加密类型</InputLabel>
                  <Select
                    value={state.encryptionType}
                    onChange={action((e) => { state.encryptionType = e.target.value as string; })}
                    label="加密类型"
                  >
                    <MenuItem value="public">public</MenuItem>
                    <MenuItem value="private">private</MenuItem>
                  </Select>
                </FormControl>
              </div> */}
            </>)}
          </div>

          {/* <StepBox
            className="my-8"
            total={1}
            value={state.step}
            onSelect={handleStepChange}
          /> */}
        </div>

        <div className="flex self-stretch justify-center items-center h-30 bg-white">
          {/* <div className="flex flex-center text-gray-4a">
            <img
              className="mr-1 mt-px"
              src={`${assetsBasePath}/logo_rumsystem.svg`}
              alt=""
              width="12"
            />
            配置费用：未知
          </div> */}
          <div className="flex items-center gap-x-8 absolute left-0 ml-20">
            <Button
              className='w-40 h-12 border'
              outline
              onClick={() => {
                if (!state.creating) {
                  handleClose();
                }
              }}
            >
              <span
                className={classNames(
                  'text-16',
                )}
              >
                {lang.cancel}
              </span>
            </Button>
          </div>
          <div className="flex items-center gap-x-8 absolute right-0 mr-20">
            {/* {state.step !== 0 && (
              <Button
                className={classNames(
                  'w-40 h-12 rounded-md border ',
                  !state.creating && '!bg-gray-f7 !border-black',
                  state.creating && '!border-gray-99',
                )}
                onClick={handlePrevStep}
                disabled={state.creating}
              >
                <span
                  className={classNames(
                    'text-16',
                    !state.creating && 'text-black',
                    state.creating && 'text-gray-99',
                  )}
                >
                  上一步
                </span>
              </Button>
            )} */}
            {/* {state.step !== 1 && (
              <Button
                className="w-40 h-12 rounded-md"
                onClick={handleNextStep}
              >
                <span className="text-16">
                  下一步
                </span>
              </Button>
            )} */}
            {state.step === 0 && (
              <Button
                className="h-12"
                onClick={handleConfirm}
                isDoing={state.creating}
                data-test-id="group-create-confirm"
              >
                <span className="text-16 px-2">
                  {lang.createGroup}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Fade>
  );
});
