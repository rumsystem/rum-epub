import React from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Book } from 'epubjs';
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  Input,
  Popover,
  Radio,
  RadioGroup,
  Slider,
  Tooltip,
} from '@material-ui/core';
import { Annotation } from 'epubjs/types/annotations';
import SliderAltIcon from 'boxicons/svg/regular/bx-slider-alt.svg?react';

import { useStore } from 'store';
import { highLightRange } from './helper';
import classNames from 'classnames';

interface Props {
  className?: string
  book?: Book | null
  // rendition?: Rendition
  renderBox?: HTMLElement | null
}

export const EpubSettings = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: false,

    fontSize: 16,
    fontSizeOverride: false,
    lineHeight: 0.875,
    dark: false,
    theme: 'default',
    font: 'default',
    customFont: '',

    cached: {
      fontSize: 16,
      fontSizeOverride: false,
      lineHeight: 0.875,
      font: 'default',
      customFont: '',
    },
  }));

  const { confirmDialogStore } = useStore();
  const buttonRef = React.useRef<HTMLDivElement>(null);

  const injectCSS = () => {
    const rendition = props.book?.rendition;
    if (!rendition) {
      return;
    }
    let css = '';
    const item = {
      ...themes[state.theme],
    };

    if (state.fontSizeOverride) {
      item.p = {
        'font-size': 'unset !important',
      };
    }

    if (item) {
      css = Object.entries(item).map(([s, r]) => {
        const rules = Object.entries(r).map(([p, v]) => `${p}:${v};`).join('');
        return `${s}{${rules}}`;
      }).join('');
    }

    rendition.views().forEach((v: any) => {
      const document = v.document as Document;
      document.head.querySelectorAll('style.rum-custom-css').forEach((v) => v.remove());
      const style = document.createElement('style');
      style.classList.add('rum-custom-css');
      style.innerHTML = css;
      document.head.append(style);
    });

    if (props.renderBox) {
      const bg = item?.body?.background ?? '';
      props.renderBox.style.background = bg;
    }
  };

  const handleChangeFontSize = action((v: number, commit: boolean) => {
    state.fontSize = v;
    if (!commit) { return; }
    const rendition = props.book?.rendition;
    if (!rendition) { return; }
    if (state.fontSize === 16) {
      rendition.themes.override('font-size', '');
    } else {
      rendition.themes.override('font-size', `${state.fontSize / 16}em`, true);
    }
  });

  const handleChangeLineHeight = action((v: number, commit: boolean) => {
    state.lineHeight = v;
    if (!commit) { return; }
    const rendition = props.book?.rendition;
    if (!rendition) { return; }
    if (state.lineHeight === 0.875) {
      rendition.themes.override('line-height', '');
    } else {
      rendition.themes.override('line-height', String(state.lineHeight));
    }
  });

  const handleChangeTheme = action((_: React.ChangeEvent, v: string) => {
    const rendition = props.book?.rendition;
    if (!rendition) {
      return;
    }
    state.theme = v;
    injectCSS();
  });

  const handleChangeFont = action((_: React.ChangeEvent, v: string) => {
    const rendition = props.book?.rendition;
    if (!rendition) {
      return;
    }
    state.font = v;
    setFont();
  });

  const handleChangeCustomFont = action((v: string) => {
    const rendition = props.book?.rendition;
    if (!rendition) {
      return;
    }
    state.customFont = v;
    setFont();
  });

  const setFont = () => {
    const rendition = props.book?.rendition;
    if (!rendition) {
      return;
    }
    let font = '';
    if (state.font === 'default') {
      font = '';
    } else if (state.font === 'custom') {
      font = state.customFont;
    } else {
      font = state.font;
    }

    rendition.themes.override('font-family', font);
  };

  const handleOpen = action(() => {
    state.open = true;

    state.cached = {
      fontSize: state.fontSize,
      fontSizeOverride: state.fontSizeOverride,
      lineHeight: state.lineHeight,
      font: state.font,
      customFont: state.customFont,
    };
  });

  const handleClose = action(() => {
    state.open = false;
    const changed = Object
      .entries(state.cached)
      .some(([k, v]) => state[k as keyof typeof state] !== v);
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
      highLightRange(book, v.cfiRange, confirmDialogStore);
    });
  };

  React.useEffect(() => {
    const rendition = props.book?.rendition;
    if (!rendition) {
      return;
    }

    const handleInjectCSS = () => injectCSS();
    injectCSS();

    rendition.hooks.content.register(handleInjectCSS);
    return () => {
      rendition.hooks.content.deregister(handleInjectCSS);
    };
  }, [props.book?.rendition]);

  return (<>
    <Tooltip title="显示设置">
      <div
        className={classNames(
          'cursor-pointer',
          props.className,
        )}
        onClick={handleOpen}
        ref={buttonRef}
      >
        <SliderAltIcon
          width="24"
          height="24"
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
          <div className="leading-loose text-16">
            字号: {state.fontSize}pt {state.fontSize === 16 && '(默认)'}
          </div>
          <Slider
            className="w-80 mt-1"
            value={state.fontSize}
            onChange={(_, v) => handleChangeFontSize(v as number, false)}
            onChangeCommitted={(_, v) => handleChangeFontSize(v as number, true)}
            step={1}
            marks
            min={10}
            max={32}
          />
          <FormControl className="block -mt-1">
            <FormControlLabel
              control={(
                <Checkbox
                  color="primary"
                  checked={state.fontSizeOverride}
                  onChange={action(() => {
                    state.fontSizeOverride = !state.fontSizeOverride;
                    injectCSS();
                  })}
                />
              )}
              label={(
                <Tooltip title="如果字号设置对某些段落不起作用的话">
                  <span>
                    强制字号大小
                  </span>
                </Tooltip>
              )}
            />
          </FormControl>
        </div>

        <div className="">
          <div className="leading-loose text-16">
            行距: {state.lineHeight === 0.875 ? '默认' : state.lineHeight}
          </div>
          <Slider
            className="w-80 mt-1"
            value={state.lineHeight}
            onChange={(_, v) => handleChangeLineHeight(v as number, false)}
            onChangeCommitted={(_, v) => handleChangeLineHeight(v as number, true)}
            step={0.125}
            marks
            min={0.875}
            max={3}
          />
        </div>

        <div className="flex flex-col">
          <div className="leading-loose text-16">
            主题
          </div>

          <FormControl className="mt-1">
            <RadioGroup className="grid grid-cols-2" value={state.theme} onChange={handleChangeTheme}>
              {[
                ['default', '默认'],
                ['gray', '浅色'],
                ['dark', '深色'],
                ['black', '黑色'],
              ].map((v) => (
                <FormControlLabel
                  className="-mt-2"
                  value={v[0]}
                  control={<Radio color="primary" />}
                  label={v[1]}
                  key={v[0]}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </div>

        <div className="flex flex-col">
          <div className="leading-loose text-16">
            字体
          </div>

          <FormControl className="mt-1">
            <RadioGroup value={state.font} onChange={handleChangeFont}>
              {[
                ['default', '默认'],
                ['serif', '衬线'],
                ['sans-serif', '非衬线'],
              ].map((v) => (
                <FormControlLabel
                  className="-mt-2"
                  value={v[0]}
                  control={<Radio color="primary" />}
                  label={v[1]}
                  key={v[0]}
                />
              ))}
              <FormControlLabel
                className="-mt-2"
                classes={{
                  label: 'w-full',
                }}
                value="custom"
                control={<Radio color="primary" />}
                label={(
                  <Input
                    className="w-full"
                    classes={{
                      input: 'text-16',
                    }}
                    placeholder="自定义"
                    value={state.customFont}
                    onChange={(e) => handleChangeCustomFont(e.target.value)}
                  />
                )}
              />
            </RadioGroup>
          </FormControl>
        </div>
      </div>
    </Popover>
  </>);
});

const themes: Record<string, Record<string, Record<string, string>>> = {
  default: {
    a: {
      color: '#5577f3',
    },
  },
  'gray': {
    '::selection': {
      background: '#39c',
      color: 'white',
    },
    body: {
      background: '#e1e1db',
      color: '#262625',
    },
    a: {
      color: '#2b79a2',
    },
  },
  'dark': {
    '::selection': {
      background: '#aaa',
      color: '#111',
    },
    body: {
      background: '#30353A',
      color: '#AAA',
    },
    a: {
      color: '#8b96b1',
    },
  },
  'black': {
    '::selection': {
      background: '#888',
      color: '#111',
    },
    body: {
      background: '#000',
      color: '#999',
    },
    a: {
      color: '#7c8393',
    },
  },
};
