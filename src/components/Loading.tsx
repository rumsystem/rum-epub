import React from 'react';
import { CircularProgress } from '@mui/material';
// import { makeStyles } from '@material-ui/core/styles';

// const useStyles = makeStyles(() => ({
//   root: {
//     position: 'relative',
//   },
//   bottom: {
//     color: (props: {color: string}) => props.color,
//     opacity: 0.3,
//   },
//   top: {
//     color: (props: {color: string}) => props.color,
//     animationDuration: '550ms',
//     position: 'absolute',
//     left: 0,
//   },
//   circle: {
//     strokeLinecap: 'round',
//   },
// }));

export const Loading = (props: { size?: number, color?: string }) => {
  const { size } = props;
  // const classes = useStyles({ color: props.color || '#999' });
  return (
    <div className="flex items-start justify-center">
      <div className="flex items-start relative">
        <CircularProgress
          style={{
            color: props.color ?? '',
          }}
          size={size || 22}
          // className={classes.bottom}
          variant="determinate"
          value={100}
        />
        <CircularProgress
          className="absolute"
          style={{
            color: props.color ?? '',
          }}
          size={size || 22}
          disableShrink
          // className={classes.top}
          // classes={{
          //   circle: classes.circle,
          // }}
        />
      </div>
    </div>
  );
};
