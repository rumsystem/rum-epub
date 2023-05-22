import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Dialog, Tooltip } from '@mui/material';
import { tooltipService } from '~/service';
import { ITrx, fetchTrx } from '~/apis';
import { lang, setClipboard } from '~/utils';

export interface Props {
  objectId?: string
  groupId: string
  trxId: string
}
export interface InternalProps {
  destroy: () => unknown
}
export const TrxInfo = observer((props: InternalProps & Props) => {
  const state = useLocalObservable(() => ({
    content: '',
    open: true,
    loading: false,
    trx: null as null | ITrx,
  }));

  const handleClose = action(() => {
    state.open = false;
    setTimeout(action(() => {
      props.destroy();
    }), 2000);
  });

  const loadTrx = async () => {
    try {
      const trx = await fetchTrx(props.groupId, props.trxId);
      runInAction(() => {
        state.trx = trx;
      });
    } catch (err) {
      console.error(err);
      tooltipService.show({
        // content: lang.failToLoad,
        content: '加载trx失败',
        type: 'error',
      });
    }
  };

  useEffect(() => {
    loadTrx();
  }, [props.trxId]);

  return (
    <Dialog open={state.open} onClose={handleClose}>
      <div className="bg-white rounded-0 p-6">
        {!!state.trx && (
          <div className="pt-2 px-6 pb-5">
            <div className="text-18 font-bold text-gray-700 text-center pb-5">
              {lang.trx.blockInfo}
            </div>
            <div
              className="grid gap-y-2 p-6 gap-x-4 text-gray-88 text-13 border border-gray-d8 rounded-0 shadow"
              style={{
                gridTemplateColumns: 'max-content 1fr',
              }}
            >
              {!!props.objectId && (<>
                <div>Object ID：</div>
                <div className="text-gray-4a truncate">
                  {props.objectId}
                </div>
              </>)}
              <div>Trx ID:</div>
              <div className="text-gray-4a truncate">
                {state.trx.TrxId}
              </div>
              <div>{lang.trx.group} ID:</div>
              <div className="text-gray-4a truncate">
                {state.trx.GroupId}
              </div>
              <div>{lang.trx.sender}:</div>
              <ValueColumn
                className="text-gray-4a truncate"
                value={state.trx.SenderPubkey}
              />
              <div>{lang.trx.data}:</div>
              <ValueColumn
                className="text-gray-4a truncate"
                value={state.trx.Data}
              />
              <div>{lang.trx.sign}:</div>
              <ValueColumn
                className="text-gray-4a truncate"
                value={state.trx.SenderSign}
              />
              <div>{lang.trx.timestamp}:</div>
              <div className="text-gray-4a truncate">
                {state.trx.TimeStamp}
              </div>
              <div>{lang.trx.version}:</div>
              <div className="text-gray-4a truncate">
                {state.trx.Version}
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
});

const handleCopy = (v: string) => {
  setClipboard(v);
  tooltipService.show({
    content: lang.copied,
  });
};

const ValueColumn = (props: { className?: string, value: string }) => (
  <Tooltip
    classes={{ tooltip: '!mb-1' }}
    placement="top"
    title={(
      <span
        className="cursor-pointer"
        onClick={() => handleCopy(props.value)}
      >
        {lang.copy}
      </span>
    )}
    arrow
  >
    <div className={props.className}>
      {props.value}
    </div>
  </Tooltip>
);
