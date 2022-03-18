import React from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Button,
} from '@mui/material';
import { DialogItem, dialogService } from './index';

export const ConfirmDialogContainer = observer(() => (
  <>
    {dialogService.state.dialogs.map((v) => (
      <ConfirmDialog item={v} key={v.id} />
    ))}
  </>
));

const ConfirmDialog = observer((props: { item: DialogItem }) => {
  const state = useLocalObservable(() => ({
    open: false,
  }));

  React.useEffect(action(() => {
    state.open = true;
  }), []);

  const handleClose = action(() => {
    props.item.rs('cancel');
    state.open = false;
  });

  const handleConfirm = action(() => {
    props.item.rs('confirm');
    state.open = false;
  });

  return (
    <Dialog
      className="flex justify-center items-center"
      classes={{
        paper: 'max-w-[450px]',
      }}
      open={state.open}
      onClose={handleClose}
    >
      <DialogTitle className="mt-2 px-8 text-gray-4a">
        {props.item.title}
      </DialogTitle>
      <DialogContent className="px-8 text-16 text-gray-64">
        {props.item.content}
      </DialogContent>
      <DialogActions className="flex justify-end items-center py-3 px-6">
        {!props.item.hideCancel && (
          <Button
            className="block bg-white cursor-pointer min-w-[70px]"
            color="inherit"
            data-test-id={props.item.cancelTestId}
            onClick={handleClose}
          >
            {props.item.cancel ?? '取消'}
          </Button>
        )}
        <Button
          className={classNames(
            'min-w-[70px]',
            props.item.danger && 'bg-red-400',
          )}
          onClick={handleConfirm}
          data-test-id={props.item.confirmTestId}
        >
          {props.item.confirm ?? '确定'}
        </Button>
      </DialogActions>
      <span className="block pb-2" />
    </Dialog>
  );
});
