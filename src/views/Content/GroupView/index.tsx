import classNames from 'classnames';
import React from 'react';
import { nodeService } from '~/service';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { GenericView } from '../GenericView';
import { EpubView } from './EpubView';

interface Props {
  className?: string
}

export const GroupView = (props: Props) => {
  const app_key = nodeService.state.activeGroup?.app_key;
  if (app_key === GROUP_TEMPLATE_TYPE.EPUB) {
    return (
      <EpubView
        className={classNames(
          'flex-col items-stretch',
          props.className,
        )}
        key={nodeService.state.activeGroupId}
      />
    );
  }
  return (
    <GenericView
      className={classNames(
        'flex-col items-stretch',
        props.className,
      )}
      key={nodeService.state.activeGroupId}
    />
  );
};
