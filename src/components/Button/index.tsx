import React from 'react';
import classNames from 'classnames';
import { ButtonProgress } from './ButtonProgress';

export * from './ButtonProgress';

interface Props {
  className?: string
  onClick?: () => unknown
  fullWidth?: boolean
  size?: 'large' | 'normal' | 'small' | 'mini' | 'tiny'
  color?: 'primary' | 'gray' | 'red' | 'green' | 'white' | 'yellow'
  disabled?: boolean
  children?: React.ReactNode
  outline?: boolean
  isDoing?: boolean
  isDone?: boolean
  hideText?: boolean
  fixedDone?: boolean
  noRound?: boolean
  'data-test-id'?: string
}

export const Button = React.forwardRef<HTMLButtonElement, Props>((props, ref) => {
  const {
    className,
    onClick,
    fullWidth = false,
    size = 'normal',
    color = 'primary',
    disabled,
    outline = false,
    isDoing = false,
    isDone = false,
    fixedDone = false,
    hideText = false,
    noRound = true,
    'data-test-id': testId,
  } = props;

  return (
    <button
      className={classNames(
        'button',
        className,

        {
          'w-full': fullWidth,
          [size]: size,
          'bg-gray-33 text-white': !outline && color === 'primary',
          'bg-gray-d8 text-white': !outline && color === 'gray',
          'bg-emerald-400 text-white': !outline && color === 'green',
          'bg-red-400 text-white': !outline && color === 'red',
          'bg-[#ff931e] text-white': !outline && color === 'yellow',
          'border-gray-33 text-black border outline':
            outline && color === 'primary',
          'border-red-400 text-red-400 border outline':
            outline && color === 'red',
          'border-emerald-500 text-emerald-500 border outline':
            outline && color === 'green',
          'border-white text-white border outline':
            outline && color === 'white',
          'border-gray-9b text-gray-9b border outline':
            outline && color === 'gray',
          'border-[#ff931e] text-[#ff931e] border outline':
            outline && color === 'yellow',
          'rounded-full': !noRound,
        },
        'outline-none leading-none',
        size === 'tiny' && 'min-w-[45px] text-12 py-[5px] px-[7px]',
        size === 'tiny' && outline && 'py-[4px] px-[6px]',
        size === 'mini' && 'min-w-[45px] text-12 py-[6px] px-[12px]',
        size === 'mini' && outline && 'py-[5px] px-[11px]',
        size === 'small' && 'min-w-[60px] text-13 py-[7px] px-[14px]',
        size === 'small' && outline && 'py-[6px] px-[13px]',
        size === 'normal' && 'text-14 py-[9px] px-[24px]',
        size === 'normal' && fullWidth && 'text-15 py-[11px] px-[24px]',
        size === 'normal' && outline && 'py-[8px] px-[23px]',
        size === 'large' && 'text-14 py-[11px] px-[24px]',
        size === 'large' && fullWidth && 'text-15 py-[11px] px-[24px]',
        size === 'large' && outline && 'py-[10px] px-[23px]',
        disabled && 'text-[rgba(0,0,0,0.26)] bg-[rgba(0,0,0,0.12)]',
      )}
      ref={ref}
      onClick={() => {
        onClick?.();
      }}
      disabled={disabled}
      data-test-id={testId}
    >
      <div className="flex justify-center items-center">
        {!hideText && props.children}
        <ButtonProgress
          isDoing={isDoing}
          isDone={isDone}
          fixedDone={fixedDone}
          color={outline ? 'text-gray-33' : 'text-white'}
          size={hideText ? 15 : 12}
        />
      </div>
    </button>
  );
});
