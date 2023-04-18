import React from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { bookService, nodeService } from '~/service';

interface UploadEpubButtonProps {
  children: (p: {
    progressPercentage: string
    hasWritePermission: boolean
    hasUploadAtLeastOneBook: boolean
  }) => React.ReactElement | null
}

export const UploadBookButton = observer((props: UploadEpubButtonProps) => {
  const state = useLocalObservable(() => ({
    open: true,
    scrollDebounceTimer: 0,

    get groupId() {
      return bookService.state.current.groupId;
    },
    get group() {
      return nodeService.state.groupMap[this.groupId];
    },
    get uploadJob() {
      return bookService.state.upload.jobs.findLast((v) => v.groupId === this.groupId);
    },
    get uploadDone() {
      return !!this.uploadJob?.done;
    },
    get progressPercentage() {
      const done = this.uploadJob?.jobs.filter((v) => v.done).length ?? 0;
      const total = this.uploadJob?.jobs.length;
      if (!total) { return '0'; }
      const progress = done / total;
      return `${(progress * 100).toFixed(2)}%`;
    },
    get hasWritePermission() {
      const groupId = state.groupId;
      const postAuthType = nodeService.state.trxAuthTypeMap.get(groupId)?.POST;
      const allowList = nodeService.state.allowListMap.get(groupId) ?? [];
      const denyList = nodeService.state.denyListMap.get(groupId) ?? [];
      const userPublicKey = state.group?.user_pubkey ?? '';
      if (postAuthType === 'FOLLOW_ALW_LIST' && allowList.every((v) => v.Pubkey !== userPublicKey)) {
        return false;
      }
      if (postAuthType === 'FOLLOW_DNY_LIST' && denyList.some((v) => v.Pubkey === userPublicKey)) {
        return false;
      }
      return true;
    },
  }));

  return props.children({
    progressPercentage: state.progressPercentage,
    hasWritePermission: state.hasWritePermission,
    hasUploadAtLeastOneBook: !!bookService.state.groupMap.get(bookService.state.current.groupId)?.length,
  });
});
