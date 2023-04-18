import { Check } from '@mui/icons-material';
import classNames from 'classnames';
import React, { Fragment } from 'react';

interface Props {
  className?: string
  total: number
  value: number
  onSelect?: (i: number) => unknown
}

export const StepBox = (props: Props) => (
  <div
    className={
      classNames(
        'flex justify-center items-center',
        props.className,
      )
    }
  >
    {Array(props.total).fill(0).map((_, i) => (
      <Fragment key={i}>
        <div
          className={classNames(
            'flex flex-center rounded-full border border-black w-6 h-6',
            props.value >= i && 'bg-black',
            props.value < i && 'bg-white',
          )}
          onClick={() => props.onSelect?.(i)}
        >
          {props.value === i && (
            <div className="h-[6px] w-[6px] bg-white rounded-full" />
          )}
          {props.value > i && (
            <Check className="text-white text-18" />
          )}
        </div>
        {i !== props.total - 1 && (
          <div
            className={classNames(
              'border-b  w-6',
              props.value <= i && 'border-gray-af',
              props.value > i && 'border-black',
            )}
          />
        )}
      </Fragment>
    ))}
  </div>
);
