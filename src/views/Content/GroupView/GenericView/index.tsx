import React from 'react';
import classNames from 'classnames';
import { GenericHeader } from './GenericHeader';

interface Props {
  className?: string
}

export const GenericView = (props: Props) => (
  <div
    className={classNames(
      props.className,
    )}
  >
    <GenericHeader />
  </div>
);
