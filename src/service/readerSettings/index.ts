import { Rendition } from 'epubjs';
import { action, observable, reaction } from 'mobx';

export type ReaderThemes = 'white' | 'light' | 'dark' | 'black';

const state = observable({
  fontSize: 16,
  lineHeight: 1.75,
  theme: 'white' as ReaderThemes,
  font: '',
  customFont: '',

  get dark() {
    return ['dark', 'black'].includes(this.theme);
  },
});

const THEME_STORAGE_KEY = 'RUMBRARY_THEME_SETTING';

const init = action(() => {
  try {
    const item = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '');

    state.fontSize = item.fontSize ?? 16;
    state.lineHeight = item.lineHeight ?? 1.75;
    state.theme = item.theme ?? 'white';
    state.font = item.font ?? '';
    state.customFont = item.customFont ?? '';
  } catch (e) {

  }

  return reaction(
    () => JSON.stringify(state),
    () => {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
    },
  );
});


const injectCSS = (rendition: Rendition) => {
  let css = '';
  const item = {
    ...readerThemes[readerSettingsService.state.theme],
  };

  // css override
  ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((v) => {
    item[v] = {
      'font-size': 'unset !important',
      'line-height': 'unset !important',
      'font-family': 'unset !important',
    };
  });
  item.h1 = { 'font-size': '2.25em !important' };
  item.h2 = { 'font-size': '2em !important' };
  item.h3 = { 'font-size': '1.5em !important' };
  item.h4 = { 'font-size': '1.2em !important' };
  item.h5 = { 'font-size': '1em !important' };
  item.h6 = { 'font-size': '0.8em !important' };

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
  updateOverrides(rendition);
};

const updateOverrides = (rendition: Rendition) => {
  if (!rendition) { return; }
  rendition.themes.override('font-size', `${readerSettingsService.state.fontSize / 16}em`, true);
  rendition.themes.override('line-height', String(readerSettingsService.state.lineHeight));

  let font = '';
  if (readerSettingsService.state.font === 'default') {
    font = '';
  } else if (readerSettingsService.state.font === 'custom') {
    font = readerSettingsService.state.customFont;
  } else {
    font = readerSettingsService.state.font;
  }
  rendition.themes.override('font-family', font);
};


export const readerSettingsService = {
  init,
  state,
  injectCSS,
  updateOverrides,
};

export const readerThemes: Record<string, Record<string, Record<string, string>>> = {
  white: {
    '::selection': {
      background: '#0080FF',
      color: 'white',
    },
    a: {
      color: '#0080FF',
    },
    body: {
      background: '#f7f7f7',
      color: '#333333',
    },
    '.rum-annotation-hl': {
      fill: 'rgba(95, 192, 233, 0.3) !important',
    },
  },
  light: {
    '::selection': {
      background: '#0080FF',
      color: 'white',
    },
    body: {
      background: '#f4f2ec',
      color: '#333333',
    },
    a: {
      color: '#0080FF',
    },
  },
  dark: {
    '::selection': {
      background: '#0080FF',
      color: 'white',
    },
    body: {
      background: '#20252A',
      color: '#ccc',
    },
    a: {
      color: '#5299e0',
    },
  },
  black: {
    '::selection': {
      background: '#0080FF',
      color: 'white',
    },
    body: {
      background: '#000',
      color: '#aaa',
    },
    a: {
      color: '#5299e0',
    },
  },
};

export const highlightTheme = {
  'white': {
    fill: '#5fc0e9',
    'fill-opacity': '30%',
  },
  'light': {
    fill: '#5fc0e9',
    'fill-opacity': '30%',
  },
  'dark': {
    fill: '#5fc0e9',
    'fill-opacity': '40%',
  },
  'black': {
    fill: '#5fc0e9',
    'fill-opacity': '40%',
  },
};

export const progressBarTheme = {
  'white': {
    track: {
      background: '#dedede',
    },
    progress: {
      background: '#4a4a4a',
    },
  },
  'light': {
    track: {
      background: '#ccc',
    },
    progress: {
      background: '#4a4a4a',
    },
  },
  'dark': {
    track: {
      background: '#666',
    },
    progress: {
      background: '#aaa',
    },
  },
  'black': {
    track: {
      background: '#555',
    },
    progress: {
      background: '#999',
    },
  },
};

export const linkTheme = {
  'white': {
    enabled: '#0080ff',
    disabled: '#888',
  },
  'light': {
    enabled: '#0080ff',
    disabled: '#888',
  },
  'dark': {
    enabled: '#5299e0',
    disabled: '#888',
  },
  'black': {
    enabled: '#5299e0',
    disabled: '#888',
  },
};
