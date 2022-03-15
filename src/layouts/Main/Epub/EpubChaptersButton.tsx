import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { NavItem } from 'epubjs';
import scrollIntoView from 'scroll-into-view-if-needed';
import { MenuItem, Popover, Tooltip } from '@material-ui/core';
import ListUlIcon from 'boxicons/svg/regular/bx-list-ul.svg?react';

interface Props {
  className?: string
  chapters: Array<NavItem>
  current: string
  onChapterClick?: (href: string) => unknown
}

export const EpubChaptersButton = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,
  }));
  const buttonRef = React.useRef<HTMLDivElement>(null);

  const handleChapterClick = (href: string) => {
    props.onChapterClick?.(href);
    handleClose();
  };

  const handleClose = action(() => {
    state.open = false;
  });

  return (<>
    <Tooltip title="章节选择">
      <div
        className={classNames(
          'cursor-pointer',
          props.className,
        )}
        onClick={action(() => { state.open = true; })}
        ref={buttonRef}
      >
        <ListUlIcon
          width="28"
          height="28"
        />
      </div>
    </Tooltip>

    <Popover
      classes={{ paper: 'mt-2' }}
      open={state.open}
      anchorEl={buttonRef.current}
      anchorOrigin={{
        horizontal: 'center',
        vertical: 'bottom',
      }}
      transformOrigin={{
        horizontal: 'center',
        vertical: 'top',
      }}
      onClose={handleClose}
      keepMounted
    >
      <div
        className="py-4 max-w-[600px]"
        style={{ maxHeight: `${Math.max(300, window.innerHeight - 250)}px` }}
      >
        <EpubChapters
          open={state.open}
          chapters={props.chapters}
          current={props.current}
          onClick={handleChapterClick}
        />
      </div>
    </Popover>
  </>);
});

interface EpubChaptersProps {
  className?: string
  chapters: Array<NavItem>
  open?: boolean
  current?: string
  onClick?: (href: string) => unknown
  inner?: boolean
  level?: number
}

const EpubChapters = (props: EpubChaptersProps) => {
  const rootBox = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (props.inner || !props.open) {
      return;
    }
    const current = rootBox.current!.querySelector('.current-chapter');
    if (!current) {
      return;
    }
    scrollIntoView(current, {
      scrollMode: 'if-needed',
    });
  }, [props.open]);

  return (
    <div
      className={classNames(props.className)}
      ref={rootBox}
    >
      {props.chapters.map((v) => {
        const isCurrent = props.current === v.href.replace(/#.*/, '');
        return (
          <div key={v.id}>
            <MenuItem
              className={classNames(
                'pr-4',
                isCurrent && 'current-chapter font-bold',
                !isCurrent && 'text-gray-88',
              )}
              style={{
                paddingLeft: `${(props.level ?? 0) * 16 + 16}px`,
              }}
              onClick={() => props.onClick?.(v.href)}
            >
              <span className="truncate">
                {v.label.trim()}
              </span>
            </MenuItem>
            {!!v.subitems && (
              <EpubChapters
                onClick={props.onClick}
                current={props.current}
                chapters={v.subitems}
                inner
                level={(props.level ?? 0) + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
