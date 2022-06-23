import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Book } from 'epubjs';
import {
  FormControl,
  FormControlLabel,
  Input,
  Popover,
  Radio,
  RadioGroup,
  Slider,
  Tooltip,
} from '@mui/material';
import { Help } from '@mui/icons-material';
import { Annotation } from 'epubjs/types/annotations';
import SliderAltIcon from 'boxicons/svg/regular/bx-slider-alt.svg?fill-icon';

import { readerSettingsService, ReaderThemes, epubService } from '~/service';
import { highLightRange } from './helper';
import { lang } from '~/utils';

interface Props {
  className?: string
  book?: Book | null
  bookTrx: string
}

export const EpubSettings = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,

    cached: {
      fontSize: 16,
      lineHeight: 0.875,
      theme: 'white',
      font: 'default',
      customFont: '',
    },
  }));

  const buttonRef = React.useRef<HTMLDivElement>(null);

  const handleChangeFontSize = action((v: number, commit: boolean) => {
    readerSettingsService.state.fontSize = v;
    if (!commit) { return; }
    if (props.book?.rendition) {
      readerSettingsService.updateOverrides(props.book.rendition);
    }
  });

  const handleChangeLineHeight = action((v: number, commit: boolean) => {
    readerSettingsService.state.lineHeight = v;
    if (!commit) { return; }
    if (props.book?.rendition) {
      readerSettingsService.updateOverrides(props.book.rendition);
    }
  });

  const handleChangeTheme = action((_: React.ChangeEvent, v: string) => {
    readerSettingsService.state.theme = v as ReaderThemes;
    if (props.book?.rendition) {
      readerSettingsService.injectCSS(props.book.rendition);
    }
  });

  const handleChangeFont = action((_: React.ChangeEvent, v: string) => {
    readerSettingsService.state.font = v;
    if (props.book?.rendition) {
      readerSettingsService.updateOverrides(props.book.rendition);
    }
  });

  const handleChangeCustomFont = action((v: string) => {
    readerSettingsService.state.customFont = v;
    if (props.book?.rendition) {
      readerSettingsService.updateOverrides(props.book.rendition);
    }
  });

  const handleOpen = action(() => {
    state.open = true;
    state.cached = {
      fontSize: readerSettingsService.state.fontSize,
      lineHeight: readerSettingsService.state.lineHeight,
      theme: readerSettingsService.state.theme,
      font: readerSettingsService.state.font,
      customFont: readerSettingsService.state.customFont,
    };
  });

  const handleClose = action(() => {
    state.open = false;
    const changed = Object
      .entries(state.cached)
      .some(([k, v]) => readerSettingsService.state[k as keyof typeof readerSettingsService.state] !== v);
    if (changed) {
      setTimeout(() => {
        handleRerender();
      }, 300);
    }
  });

  const handleRerender = () => {
    const book = props.book;
    if (!book) {
      return;
    }

    const annotations: Array<Annotation> = Object.values((book.rendition.annotations as any)._annotations);
    const highlights = annotations.filter((v) => v.type === 'highlight');
    highlights.forEach((v) => {
      book.rendition.annotations.remove(v.cfiRange, v.type);
    });
    highlights.forEach((v) => {
      highLightRange({
        groupId: epubService.state.current.groupId,
        bookTrx: props.bookTrx,
        cfiRange: v.cfiRange,
        book,
      });
    });
  };

  return (<>
    <Tooltip title={lang.epubSettings.displaySetting}>
      <div
        className={classNames(
          'flex flex-center cursor-pointer',
          props.className,
        )}
        onClick={handleOpen}
        ref={buttonRef}
      >
        <SliderAltIcon
          className={classNames(
            'text-22',
            !readerSettingsService.state.dark && 'text-black',
            readerSettingsService.state.dark && 'text-gray-af',
          )}
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
      <div className="flex flex-col gap-y-3 p-5">
        <div className="">
          <div className="leading-loose text-14">
            {lang.epubSettings.fontSize}:
            &nbsp;{readerSettingsService.state.fontSize}pt
            &nbsp;{readerSettingsService.state.fontSize === 16 && `(${lang.epubSettings.default})`}
          </div>
          <Slider
            className="w-70"
            classes={{ mark: 'hidden' }}
            value={readerSettingsService.state.fontSize}
            onChange={(_, v) => handleChangeFontSize(v as number, false)}
            onChangeCommitted={(_, v) => handleChangeFontSize(v as number, true)}
            step={2}
            marks
            size="small"
            min={14}
            max={24}
          />
        </div>

        <div className="">
          <div className="leading-loose text-14">
            {lang.epubSettings.lineHeight}:
            &nbsp;{readerSettingsService.state.lineHeight }
            &nbsp;{readerSettingsService.state.lineHeight === 1.75 && `(${lang.epubSettings.default})`}
          </div>
          <Slider
            className="w-70"
            classes={{ mark: 'hidden' }}
            value={readerSettingsService.state.lineHeight}
            onChange={(_, v) => handleChangeLineHeight(v as number, false)}
            onChangeCommitted={(_, v) => handleChangeLineHeight(v as number, true)}
            step={null}
            marks={[1.2, 1.35, 1.5, 1.75, 1.9, 2.1].map((value) => ({ value }))}
            size="small"
            max={2.1}
            min={1.2}
          />
        </div>

        <div className="flex flex-col">
          <div className="leading-loose text-14">
            {lang.epubSettings.theme}
          </div>

          <FormControl className="mt-1">
            <RadioGroup className="grid grid-cols-2" value={readerSettingsService.state.theme} onChange={handleChangeTheme}>
              {[
                ['white', lang.epubSettings.default],
                ['light', lang.epubSettings.light],
                ['dark', lang.epubSettings.dark],
                ['black', lang.epubSettings.black],
              ].map((v) => (
                <FormControlLabel
                  classes={{ label: 'text-14' }}
                  className="-mt-2"
                  value={v[0]}
                  control={<Radio size="small" color="primary" />}
                  label={v[1]}
                  key={v[0]}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </div>

        <div className="flex flex-col">
          <div className="leading-loose text-14">
            {lang.epubSettings.font}
          </div>

          <FormControl className="mt-1">
            <RadioGroup value={readerSettingsService.state.font} onChange={handleChangeFont}>
              {[
                ['default', lang.epubSettings.default],
                ['serif', lang.epubSettings.serif],
                ['sans-serif', lang.epubSettings.sansSerif],
              ].map((v) => (
                <FormControlLabel
                  className="-mt-2"
                  classes={{ label: 'text-14' }}
                  value={v[0]}
                  control={<Radio size="small" color="primary" />}
                  label={v[1]}
                  key={v[0]}
                />
              ))}
              <div className="flex items-center">
                <FormControlLabel
                  className="-mt-2 flex-1"
                  classes={{
                    label: 'w-full text-14',
                  }}
                  value="custom"
                  control={<Radio size="small" color="primary" />}
                  label={(
                    <Input
                      className="w-full"
                      classes={{
                        input: 'text-14',
                      }}
                      placeholder={lang.epubSettings.custom}
                      value={readerSettingsService.state.customFont}
                      onChange={(e) => handleChangeCustomFont(e.target.value)}
                    />
                  )}
                />
                <Tooltip title={lang.epubSettings.customFontTip}>
                  <Help className="text-20" />
                </Tooltip>
              </div>
            </RadioGroup>
          </FormControl>
        </div>
      </div>
    </Popover>
  </>);
});
