import { shell } from '@electron/remote';
import escapeStringRegexp from 'escape-string-regexp';
import { runInAction } from 'mobx';

export * from './PollingTask';
export * from './ago';
export * from './enum';
export * from './fallback';
export * from './lang';
export * from './setClipboard';

export const setIntervalAsTimeout = (fn: (...a: Array<any>) => any, interval?: number) => {
  let timerId = 0;
  let stop = false;

  const reRun = async () => {
    if (stop) return;
    await fn();
    if (stop) return;
    timerId = window.setTimeout(reRun, interval);
  };

  timerId = window.setTimeout(reRun, interval);

  return () => {
    stop = true;
    window.clearInterval(timerId);
  };
};

export const createPromise = <T extends unknown>() => {
  let rs!: (v: T) => unknown;
  let rj!: (v: any) => unknown;

  const p = new Promise<T>((resolve, reject) => {
    rs = resolve;
    rj = reject;
  });

  return { p, rs, rj };
};

type SetLoading = (l: boolean) => unknown;
type UnknownFunction = (...p: Array<any>) => unknown;
type RunLoading = <T extends UnknownFunction>(s: SetLoading, fn: T) => Promise<ReturnType<T>>;
/**
 * 立即执行异步函数 fn。
 * 执行前调用 setLoading(true)，执行完毕调用 setLoading(false)
 */
export const runLoading: RunLoading = async (setLoading, fn) => {
  runInAction(() => setLoading(true));
  try {
    const result = await fn();
    return result as ReturnType<typeof fn>;
  } finally {
    runInAction(() => setLoading(false));
  }
};

export const addLinkOpen = (element: HTMLElement | Window) => {
  element.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'A') {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href && href.startsWith('http')) {
        shell.openExternal(href);
      }
    }
  });
};

export const splitByHighlightText = (groupName: string, highlight: string) => {
  const reg = new RegExp(escapeStringRegexp(highlight), 'ig');
  const matches = Array.from(groupName.matchAll(reg)).map((v) => ({
    start: v.index!,
    end: v.index! + v[0].length,
  }));
  const sections: Array<{ type: 'text' | 'highlight', text: string }> = [
    { start: 0, end: matches.at(0)!.start, type: 'text' } as const,
    ...matches.map((v) => ({ ...v, type: 'highlight' } as const)),
    { start: matches.at(-1)!.end, end: groupName.length, type: 'text' } as const,
  ].flatMap((v, i, a) => {
    const next = a[i + 1];
    if (next && next.start > v.end) {
      return [v, { start: v.end, end: next.start, type: 'text' as const }];
    }
    return v;
  }).map((v) => ({
    type: v.type,
    text: groupName.substring(v.start, v.end),
  }));
  return sections;
};

export const promiseAllSettledThrottle = <T extends readonly (() => Promise<unknown>)[]>(
  values: T,
  concurrentLimit: number,
): Promise<{
  [K in keyof T]: K extends number
    ? PromiseSettledResult<Awaited<ReturnType<T[K]>>>
    : unknown
}> => {
  let running = 0;
  const result: Array<any> = [];
  let current = 0;

  const p = createPromise();

  const run = () => {
    if (current === values.length) {
      if (running === 0) {
        p.rs(result);
      }
      return;
    }
    while (running < concurrentLimit && current < values.length) {
      running += 1;
      const itemIndex = current;
      const item = values[current]();
      item.then(
        (v) => {
          result[itemIndex] = {
            status: 'fulfilled',
            value: v,
          };
        },
        (e) => {
          result[itemIndex] = {
            status: 'rejected',
            reason: e,
          };
        },
      ).finally(() => {
        running -= 1;
        run();
      });
      result[current] = item;
      current += 1;
    }
  };

  run();

  return p.p as any;
};

/**
 * 返回原函数，但该函数在连续多次调用时，首次调用未resolve时，返回缓存的 promise
 */
export const cachePromiseHof = <T extends (...args: Array<any>) => unknown>(fn: T) => {
  let promise: null | Promise<unknown> = null;

  return ((...args) => {
    if (promise) {
      return promise;
    }
    promise = Promise.resolve(fn(...args));
    promise.finally(() => {
      promise = null;
    });
    return promise;
  }) as T;
};

export const modifierKeys = (e: KeyboardEvent, keys: Array<'shift' | 'ctrl' | 'alt' | 'meta'> = []) => {
  const keyNames = keys.map((v) => `${v}Key` as const);
  const notAllowedKeyNames = (['shiftKey', 'ctrlKey', 'altKey', 'metaKey'] as const).filter((v) => !keyNames.includes(v));
  return keyNames.every((k) => e[k]) && notAllowedKeyNames.every((k) => !e[k]);
};


export const sleep = (duration: number) => new Promise((resolve: any) => {
  setTimeout(() => {
    resolve();
  }, duration);
});
