import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { CircularProgress, Dialog } from '@mui/material';
import { Notification, linkGroupService } from '~/service';
import { runLoading } from '~/utils';
import { Scrollable, useLoadingDetector } from '~/components';
import { NotificationItem } from './NotificationItem';

export interface Props {
  groupId: string
}
export interface InternalProps {
  destroy: () => unknown
}
export const NotificationModal = observer((props: InternalProps & Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    limit: 20 as const,
    offset: 0,
    list: [] as Array<Notification>,
    loading: false,
    done: false,
  }));

  const loadNotifications = () => {
    if (state.loading || state.done) { return false; }
    return runLoading(
      (l) => { state.loading = l; },
      async () => {
        const items = await linkGroupService.notification.list({
          groupId: props.groupId,
          limit: state.limit,
          offset: state.offset,
        });
        runInAction(() => {
          state.offset += state.limit;
          state.done = items.length < state.limit;
          items.forEach((v) => state.list.push(v));
        });
        return !!items.length;
      },
    );
  };

  const loadingDetector = useLoadingDetector(loadNotifications);

  const handleClose = action(() => {
    state.open = false;
    setTimeout(props.destroy, 2000);
  });

  const clearUnreadNotification = action(() => {
    linkGroupService.notification.clearUnread(props.groupId);
  });


  useEffect(() => {
    loadNotifications();
    clearUnreadNotification();
  }, []);

  return (
    <Dialog open={state.open} onClose={handleClose}>
      <Scrollable className="w-[550px] h-[700px]">
        <div className="flex-col items-stretch bg-white rounded-0 px-6 py-2 divide-y divide-black/5">
          {state.list.map((v) => (
            <NotificationItem notification={v} key={v.id} />
          ))}

          {state.loading && (
            <div className="flex flex-center p-4">
              <CircularProgress />
            </div>
          )}
        </div>
        <loadingDetector.Component offset={200} />
      </Scrollable>
    </Dialog>
  );
});
