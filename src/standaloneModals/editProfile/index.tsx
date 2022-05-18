import React from 'react';
import { createRoot } from 'react-dom/client';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Fade } from '@mui/material';
import { ChevronLeft } from '@mui/icons-material';

import { ThemeRoot } from '~/utils/theme';

export const editProfile = async () => new Promise<void>((rs) => {
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
        <EditProfile
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

const EditProfile = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

  const handleClose = action(() => {
    props.rs();
    state.open = false;
  });

  React.useEffect(() => {
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
            返回
          </button>
          <div className="text-20 font-bold">
            设置个人信息
          </div>
        </div>

        <div className="flex-col flex-center flex-1 h-0 p-12">
          <div className="overflow-auto w-[800px]">
            <div className="flex-col items-stretch bg-white px-22 py-10 min-h-[650px] text-gray-4a">
              hi
            </div>
          </div>
        </div>
      </div>
    </Fade>
  );
});
