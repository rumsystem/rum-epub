import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { MenuItem, MenuList, Popover } from '@mui/material';

interface Props {
  menu: TitleBarMenuItem
}

export interface TitleBarMenuItem {
  text: React.ReactNode
  action?: () => unknown
  children?: Array<TitleBarMenuItem>
  hidden?: boolean
  classNames?: string
}

export const TitleBarItem = observer((props: Props) => {
  const { menu: v } = props;
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        className={classNames(
          'px-4 mx-1 cursor-pointer flex items-center focus:bg-gray-4a',
          open && 'bg-gray-4a',
        )}
        onClick={v.action ?? (() => setOpen(true))}
        ref={buttonRef}
      >
        {v.text}
      </button>

      {!!v.children && (
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          anchorEl={buttonRef.current}
          style={{ zIndex: 1000000001 }}
          PaperProps={{
            className: 'bg-black text-white',
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
            {v.children.filter((v) => !v.hidden).map((v, i) => (
              <MenuItem
                className={classNames(
                  'hover:bg-gray-4a duration-0 text-14',
                  v.classNames || '',
                )}
                onClick={() => {
                  v.action?.();
                  setOpen(false);
                }}
                key={'menu-right-item-' + i}
              >
                {v.text}
              </MenuItem>
            ))}
          </MenuList>
        </Popover>
      )}
    </>
  );
});
