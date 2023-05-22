import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { NavItem } from 'epubjs';
import { Button, Divider, MenuItem, Popover, Tooltip } from '@mui/material';
import ListUlIcon from 'boxicons/svg/regular/bx-list-ul.svg?fill-icon';
import { readerSettingsService } from '~/service';
import { lang, modifierKeys } from '~/utils';

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
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const chaptersBox = React.useRef<HTMLDivElement>(null);

  const handleChapterClick = (href: string) => {
    props.onChapterClick?.(href);
    handleClose();
  };

  const handleOpen = action(() => {
    state.open = true;
    window.setTimeout(() => {
      const current = chaptersBox.current!.querySelector('.current-chapter') as HTMLDivElement | undefined;
      if (!current) {
        return;
      }
      chaptersBox.current!.scrollTo({
        top: Math.max(current.offsetTop - 200, 0),
      });
    });
  });

  const handleClose = action(() => {
    state.open = false;
  });

  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const targetTagName = (e.target as HTMLElement)?.tagName.toLowerCase();
      if (['textarea', 'input'].includes(targetTagName)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'c' && modifierKeys(e, ['shift'])) {
        handleOpen();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  return (<>
    <Tooltip title={lang.epub.chapterSelect}>
      <Button
        className={classNames(
          'flex flex-center p-0 w-8 h-8 min-w-0',
          props.className,
        )}
        onClick={handleOpen}
        ref={buttonRef}
        variant="text"
      >
        <ListUlIcon
          className={classNames(
            'text-26',
            !readerSettingsService.state.dark && 'text-black',
            readerSettingsService.state.dark && 'text-gray-af',
          )}
        />
      </Button>
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
      PaperProps={{
        ref: chaptersBox,
      }}
    >
      <div
        className="max-w-[600px] min-w-[250px]"
        style={{ maxHeight: `${Math.max(300, window.innerHeight - 300)}px` }}
      >
        <div className="flex flex-center text-20 text-gray-70 py-4">
          {lang.epub.toc}
        </div>
        {!!props.chapters.length && (
          <Divider className="!my-0 mx-4" />
        )}
        <EpubChapters
          chapters={props.chapters}
          current={props.current}
          onClick={handleChapterClick}
        />
        <div className="h-4" />
      </div>
    </Popover>
  </>);
});

interface EpubChaptersProps {
  className?: string
  chapters: Array<NavItem>
  current?: string
  onClick?: (href: string) => unknown
  inner?: boolean
  level?: number
  nonRoot?: boolean
}

const EpubChapters = (props: EpubChaptersProps) => (
  <div className={classNames(props.className)}>
    {!props.chapters.length && !props.nonRoot && (
      <MenuItem className="flex flex-center">
        {lang.epub.noChapter}
      </MenuItem>
    )}
    {props.chapters.map((v) => {
      const isCurrent = props.current === v.href.replace(/#.*/, '');
      return (
        <div key={v.id}>
          <MenuItem
            className={classNames(
              'pr-4 py-2 text-producer-blue',
              isCurrent && 'current-chapter font-bold',
              !isCurrent && 'text-gray-88',
            )}
            style={{
              paddingLeft: `${(props.level ?? 0) * 20 + 20}px`,
            }}
            data-is-current={isCurrent ? 'true' : 'false'}
            onClick={() => props.onClick?.(v.href)}
          >
            <span className="truncate">
              {v.label.trim()}
            </span>
          </MenuItem>
          <Divider className="!my-0 mx-4" />
          {!!v.subitems && (
            <EpubChapters
              onClick={props.onClick}
              current={props.current}
              chapters={v.subitems}
              inner
              level={(props.level ?? 0) + 1}
              nonRoot
            />
          )}
        </div>
      );
    })}
  </div>
);
