import React, { RefObject } from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import classNames from 'classnames';
import { action, observable } from 'mobx';
import { ClickAwayListener, Popover } from '@mui/material';

interface TitleBarMenuItem {
  content: React.ReactNode
  children?: Array<TitleBarMenuItem>
  action?: (e: React.MouseEvent) => unknown
}

interface Props {
  className?: string
  items: Array<TitleBarMenuItem>
}

export const TitleBarMenu = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    activeMenu: null as null | number,
  }));

  const refs = React.useRef<Array<HTMLButtonElement>>([]);

  const handleMouseEnter = action((i: number) => {
    if (state.activeMenu !== null) {
      state.activeMenu = i;
    }
  });

  return (<>
    <ClickAwayListener onClickAway={action(() => { state.activeMenu = null; })}>
      <div className="flex text-white relative z-10">
        {props.items.map((v, i) => (
          <div className="flex items-stretch relative" key={i}>
            <button
              className={classNames(
                'flex items-center hover:bg-white/30 px-4',
                state.activeMenu === i && '!bg-white/40',
              )}
              onClick={action((e) => {
                v.action?.(e);
                if (v.children?.length) {
                  state.activeMenu = i;
                }
              })}
              onMouseEnter={() => handleMouseEnter(i)}
              ref={action((v: HTMLButtonElement) => { refs.current[i] = v; })}
            >
              {v.content}
            </button>
            <Popover
              className="pointer-events-none"
              classes={{
                paper: 'rounded-none shadow-4',
              }}
              anchorEl={refs.current[i]}
              anchorOrigin={{
                horizontal: 'left',
                vertical: 'bottom',
              }}
              transitionDuration={0}
              open={state.activeMenu === i}
            >
              {!!v.children?.length && (
                <div className="flex-col bg-black text-white pointer-events-auto py-2">
                  {v.children?.map((u, j) => (
                    <button
                      className="flex items-center hover:bg-white/30 h-[34px] px-4 whitespace-nowrap text-left"
                      key={j}
                      onClick={u.action}
                    >
                      {u.content}
                    </button>
                  ))}
                </div>
              )}
            </Popover>
          </div>
        ))}
      </div>
    </ClickAwayListener>
    {state.activeMenu !== null && (
      <div className="fixed inset-0 " />
    )}
  </>);
});
