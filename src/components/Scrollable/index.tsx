import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';

import { getScrollBarWidth } from './getScrollbarWdith';

interface Props {
  direction?: 'vertical' | 'horizontal'
  children?: React.ReactNode
  className?: string
  wrapperClassName?: string
  trackClassName?: string
  thumbClassName?: string
  scrollBoxRef?: React.MutableRefObject<HTMLDivElement | null>
  scrollBoxProps?: Partial<React.HTMLAttributes<HTMLDivElement>>
  scrollBoxClassName?: string
  onScroll?: () => unknown
  light?: boolean
  hideTrackOnMobile?: boolean
  hideTrack?: boolean
  autoHideMode?: boolean
  size?: 'small' | 'normal' | 'large' | {
    thumb: number
    thumbHover: number
    track: number
  }
}

const widthMap = {
  small: {
    thumb: 6,
    thumbHover: 8,
    track: 12,
  },
  normal: {
    thumb: 8,
    thumbHover: 10,
    track: 16,
  },
  large: {
    thumb: 10,
    thumbHover: 13,
    track: 20,
  },
};

export const Scrollable = observer((props: Props) => {
  const horizontal = props.direction === 'horizontal';
  const state = useLocalObservable(() => ({
    hide: !!props.autoHideMode,
    hover: false,
    drag: {
      start: false,
      startPosition: 0,
      startScrollPosition: 0,
    },
    noScrollBar: true,
    scrollbar: {
      track: {
        start: 0,
      },
      thumb: {
        sizePixel: 0,
        sizePercentage: '0',
        position: '0',
      },
    },
    scrollbarWidth: getScrollBarWidth(),

    get thumbStyle() {
      return {
        [horizontal ? 'width' : 'height']: `${state.scrollbar.thumb.sizePercentage}%`,
        [horizontal ? 'left' : 'top']: `${state.scrollbar.thumb.position}%`,
      };
    },
    get scrollBoxStyle() {
      return {
        [horizontal ? 'marginBottom' : 'marginRight']: `${-state.scrollbarWidth}px`,
      };
    },
  }));

  const containerRef = React.useRef() as React.MutableRefObject<HTMLDivElement | null>;
  const contentWrapperRef = React.useRef<HTMLDivElement>(null);
  const thumb = React.useRef<HTMLDivElement>(null);

  const calcScrollbarWidth = action(() => {
    state.scrollbarWidth = getScrollBarWidth();
  });

  const handleScrollbarThumbMouseDown = action((e: React.MouseEvent) => {
    if (!containerRef.current) {
      return;
    }
    e.preventDefault();
    state.drag.start = true;
    state.drag.startPosition = horizontal ? e.clientX : e.clientY;
    state.drag.startScrollPosition = horizontal
      ? containerRef.current.scrollLeft
      : containerRef.current.scrollTop;
  });

  const handleScrollbarThumbMousemove = action((e: MouseEvent) => {
    if (!containerRef.current) {
      return;
    }
    if (state.drag.start) {
      e.preventDefault();

      const {
        scrollHeight,
        scrollWidth,
        clientHeight,
        clientWidth,
      } = containerRef.current;
      const scrollSize = horizontal ? scrollWidth : scrollHeight;
      const clientSize = horizontal ? clientWidth : clientHeight;

      const scrollSpacePixel = scrollSize - clientSize;
      const scrollWindowPixel = clientSize * (1 - state.scrollbar.thumb.sizePixel);
      const mouseMovePixel = (horizontal ? e.clientX : e.clientY) - state.drag.startPosition;
      const movePercentage = mouseMovePixel / scrollWindowPixel;
      const scrollDeltaPixel = scrollSpacePixel * movePercentage;

      let targetScrollPosition = state.drag.startScrollPosition + scrollDeltaPixel;
      if (targetScrollPosition > scrollSpacePixel) {
        targetScrollPosition = scrollSpacePixel;
      }
      if (targetScrollPosition < 0) {
        targetScrollPosition = 0;
      }

      if (horizontal) {
        containerRef.current.scrollLeft = targetScrollPosition;
      } else {
        containerRef.current.scrollTop = targetScrollPosition;
      }
    }
  });

  const handleScrollbarThumbMouseup = action(() => {
    state.drag.start = false;
  });

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!containerRef.current) { return; }
    if (e.target !== e.currentTarget) { return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = horizontal
      ? ((e.clientX - rect.left) / rect.width) * 100
      : ((e.clientY - rect.top) / rect.height) * 100;
    const isStart = clickPosition < Number(state.scrollbar.thumb.position);
    const isEnd = clickPosition > (Number(state.scrollbar.thumb.position) + Number(state.scrollbar.thumb.sizePixel));
    if (isStart) {
      containerRef.current.scrollTo({
        [horizontal ? 'left' : 'top']: horizontal
          ? containerRef.current.scrollLeft - containerRef.current.clientWidth
          : containerRef.current.scrollTop - containerRef.current.clientHeight,
      });
    }
    if (isEnd) {
      containerRef.current.scrollTo({
        [horizontal ? 'left' : 'top']: horizontal
          ? containerRef.current.scrollLeft + containerRef.current.clientWidth
          : containerRef.current.scrollTop + containerRef.current.clientHeight,
      });
    }
  };

  const calcScrollbar = action(() => {
    if (!containerRef.current) {
      return;
    }
    const {
      scrollTop,
      scrollLeft,
      scrollHeight,
      scrollWidth,
      clientHeight,
      clientWidth,
    } = containerRef.current;

    const scrollSize = horizontal ? scrollWidth : scrollHeight;
    const clientSize = horizontal ? clientWidth : clientHeight;
    const scrollPosition = horizontal ? scrollLeft : scrollTop;

    const sizePercentage = clientSize / scrollSize;
    const scrollSpace = scrollSize - clientSize;
    const scrollPercentage = scrollPosition / scrollSpace;

    const thumbHeight = Math.max(sizePercentage, 0.04);
    const thumbTop = (1 - thumbHeight) * scrollPercentage;

    state.noScrollBar = sizePercentage >= 1;

    const thumbSize = (thumbHeight * 100).toFixed(4);
    const thumbPosition = (thumbTop * 100).toFixed(4);

    // prevent infinite update
    if (state.scrollbar.track.start !== scrollPosition) {
      state.scrollbar.track.start = scrollPosition;
    }
    if (state.scrollbar.thumb.sizePixel !== thumbHeight) {
      state.scrollbar.thumb.sizePixel = thumbHeight;
    }
    if (state.scrollbar.thumb.sizePercentage !== thumbSize) {
      state.scrollbar.thumb.sizePercentage = thumbSize;
    }
    if (state.scrollbar.thumb.position !== thumbPosition) {
      state.scrollbar.thumb.position = thumbPosition;
    }
  });

  React.useEffect(() => {
    window.addEventListener('resize', calcScrollbarWidth, false);
    window.addEventListener('mousemove', handleScrollbarThumbMousemove, false);
    window.addEventListener('mouseup', handleScrollbarThumbMouseup, false);

    const ro = new ResizeObserver(calcScrollbar);
    window.setTimeout(() => {
      if (containerRef.current) {
        ro.observe(containerRef.current);
      }
      if (contentWrapperRef.current) {
        ro.observe(contentWrapperRef.current);
      }
    });

    calcScrollbar();

    return () => {
      window.removeEventListener('resize', calcScrollbarWidth, false);
      window.removeEventListener('mousemove', handleScrollbarThumbMousemove, false);
      window.removeEventListener('mouseup', handleScrollbarThumbMouseup, false);
      ro.disconnect();
    };
  }, []);

  React.useEffect(() => {
    calcScrollbar();
  });

  const sizes = typeof props.size === 'object'
    ? props.size
    : widthMap[props.size ?? 'normal'];

  const showTrack = !props.hideTrack && !(!state.scrollbarWidth && props.hideTrackOnMobile);
  const SecAxisSizeProp = horizontal ? 'height' : 'width';

  return (
    <div
      className={classNames(
        'scrollable relative flex overflow-hidden',
        props.className,
      )}
      onMouseEnter={action(() => { if (props.autoHideMode) { state.hide = false; } })}
      onMouseLeave={action(() => { if (props.autoHideMode) { state.hide = true; } })}
    >
      {showTrack && (
        <div
          className={classNames(
            'scroll-bar-track absolute z-[200]',
            props.direction !== 'horizontal' && 'top-[3px] right-0 bottom-[3px]',
            horizontal && 'left-[3px] bottom-0 right-[3px]',
            state.noScrollBar && 'no-scroll-bar',
            !!props.autoHideMode && 'duration-150',
            !!props.autoHideMode && state.hide && 'opacity-0',
            props.trackClassName,
          )}
          style={{ [SecAxisSizeProp]: `${sizes.track}px` }}
          onClick={handleTrackClick}
          onMouseEnter={action(() => { state.hover = true; })}
          onMouseLeave={action(() => { state.hover = false; })}
        >
          {!state.noScrollBar && (
            <div
              className={classNames(
                'scroll-bar-thumb-box absolute justify-center cursor-pointer',
                props.direction !== 'horizontal' && 'flex h-0 left-0 right-0',
                horizontal && 'flex-col w-0 left-0 right-0',
                props.thumbClassName,
              )}
              onMouseDown={handleScrollbarThumbMouseDown}
              style={{ [SecAxisSizeProp]: `${sizes.track}px`, ...state.thumbStyle }}
            >
              <div
                className={classNames(
                  'scroll-bar-thumb ease-in-out duration-100 rounded-full',
                  !props.light && 'bg-black/15 group-hover:bg-black/25',
                  props.light && 'bg-white/25 group-hover:bg-white/40',
                  !props.light && state.drag.start && 'bg-black/25',
                  props.light && state.drag.start && 'bg-white/40',
                )}
                ref={thumb}
                style={{ [SecAxisSizeProp]: `${state.hover || state.drag.start ? sizes.thumbHover : sizes.thumb}px` }}
              />
            </div>
          )}
        </div>
      )}
      <div className="scroll-content flex-col flex-auto overflow-hidden">
        <div
          style={state.scrollBoxStyle}
          className={classNames(
            'scroll-box flex-col flex-auto ',
            state.noScrollBar && 'pr-0',
            props.direction !== 'horizontal' && 'overflow-y-scroll overflow-x-hidden',
            horizontal && 'overflow-y-hidden overflow-x-scroll',
            props.scrollBoxClassName,
          )}
          onScroll={() => {
            calcScrollbar();
            if (props.onScroll) {
              props.onScroll();
            }
          }}
          onMouseEnter={calcScrollbar}
          ref={(a) => {
            if (props.scrollBoxRef) {
              props.scrollBoxRef.current = a;
            }
            containerRef.current = a || null;
          }}
          {...props.scrollBoxProps}
        >
          <div
            className={classNames(
              'content-wrapper flex-1',
              props.direction !== 'horizontal' && 'w-full h-max',
              horizontal && 'h-full w-max',
              props.wrapperClassName,
            )}
            ref={contentWrapperRef}
          >
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
});
