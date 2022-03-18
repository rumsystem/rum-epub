import classNames from 'classnames';
import React from 'react';
import { nodeService } from '~/service/node';
import { GROUP_TEMPLATE_TYPE } from '~/utils/constant';
import { EpubView } from './EpubView';

interface Props {
  className?: string
}

export const GroupView = (props: Props) => (<>
  {(nodeService.state.activeGroup?.app_key as any) === GROUP_TEMPLATE_TYPE.EPUB && (
    <EpubView
      className={classNames(
        'flex-col items-stretch',
        props.className,
      )}
      key={nodeService.state.activeGroupId}
    />
  )}
  <div className="hidden" />
</>
);
