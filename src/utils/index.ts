import { runInAction } from 'mobx';

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
