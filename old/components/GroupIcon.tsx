import React from 'react';
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';
import { IGroup } from 'quorum-sdk-electron-renderer';

interface Props {
  group: IGroup
  width: number
  height: number
  fontSize: number
  groupIcon?: string
  className?: string
  colorClassName?: string
}

export default observer((props: Props) => {
  // const groupIcon = props.groupIcon || (groupStore.configMap.get(props.groupId)?.[GROUP_CONFIG_KEY.GROUP_ICON] ?? '') as string;
  // TODO: groupIcon
  const groupIcon = null;

  if (!groupIcon) {
    return (
      <div>
        <div
          className={classNames(
            'flex flex-center group-letter font-bold uppercase bg-gray-af leading-none',
            props.colorClassName ?? 'text-white',
            props.className,
          )}
          style={{
            width: props.width,
            height: props.height,
            fontSize: props.fontSize,
            fontFamily: "Varela Round, Nunito Sans, PingFang SC, Hiragino Sans GB, Heiti SC, '幼圆', '圆体-简', sans-serif",
          }}
        >
          {props.group.group_name.trim().substring(0, 1)}
        </div>
      </div>
    );
  }

  return (
    <img
      className={props.className || ''}
      src={groupIcon}
      width={props.width}
      height={props.height}
      alt='icon'
    />
  );
});
