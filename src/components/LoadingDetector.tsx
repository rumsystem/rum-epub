import { useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';
import { runLoading } from '~/utils';

interface ComponentProps {
  className?: string
  offset?: number
  indicator?: boolean
}

export const useLoadingDetector = (cb: () => unknown) => {
  const loadingTriggerBox = useRef<HTMLDivElement>(null);
  const state = useRef({
    visible: false,
    stop: false,
    loading: false,
    load: async () => {},
  });

  state.current.load = async () => {
    if (!state.current.visible || state.current.stop || state.current.loading) { return; }
    await runLoading(
      (l) => { state.current.loading = l; },
      async () => {
        try {
          const result = await cb?.();
          if (result === false) { return; }
          setTimeout(() => state.current.load(), 0);
        } catch (e) {
          console.error(e);
        }
      },
    );
  };

  const Component = useMemo(() => (props: ComponentProps) => {
    useEffect(() => {
      const io = new IntersectionObserver(([entry]) => {
        state.current.visible = entry.intersectionRatio > 0.01;
        state.current.load();
      }, { threshold: [0.01] });

      if (loadingTriggerBox.current) {
        io.observe(loadingTriggerBox.current);
      }

      return () => {
        io.disconnect();
        state.current.stop = true;
      };
    }, []);

    return (
      <div
        className={classNames(
          'relative pointer-events-none',
          props.className,
        )}
      >
        <div
          className={classNames(
            'absolute bottom-0 left-1/2 ',
            !props.indicator && 'w-0',
            props.indicator && 'w-2 bg-red-400',
          )}
          style={{
            height: `${props.offset ?? 100}px`,
          }}
          ref={loadingTriggerBox}
        />
      </div>
    );
  }, []);

  const value = useMemo(() => ({
    Component,
    get() {
      return state.current.visible;
    },
    cb,
  }), []);

  return value;
};
