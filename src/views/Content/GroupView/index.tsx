import classNames from 'classnames';
import { EpubView } from './EpubView';

interface Props {
  className?: string
}

export const GroupView = (props: Props) => (
  <EpubView
    className={classNames(
      'flex-col items-stretch',
      props.className,
    )}
  />
);
