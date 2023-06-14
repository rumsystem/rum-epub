import React from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { utils } from 'rum-sdk-browser';
import { Button, CircularProgress, IconButton } from '@mui/material';
import { ArrowUpward, ChevronLeft, Create } from '@mui/icons-material';

import { bookService, linkGroupService, nodeService } from '~/service';
import { Scrollable, UserAvatar, UserName, useLoadingDetector } from '~/components';
import { createPost, editProfile } from '~/standaloneModals';
import { lang } from '~/utils';
import { PostItem } from './PostItem';
import { BiTime } from 'react-icons/bi';
import { AiOutlineFire } from 'react-icons/ai';

export const EpubLinkGroupView = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    sort: 'time' as 'time' | 'hot',
    get bookGroupId() {
      return bookService.state.current.groupId;
    },
    get groupId() {
      return bookService.state.current.linkGroupId;
    },
    get group() {
      return nodeService.state.groupMap[this.groupId];
    },
    get posts() {
      return linkGroupService.state.post.ids.map((id) => linkGroupService.state.post.map.get(id)!);
    },
    get loading() {
      return linkGroupService.state.post.loading;
    },
    get done() {
      return linkGroupService.state.post.done;
    },
    get linkGroupUserAddress() {
      const pubkey = this.group?.user_pubkey;
      if (!pubkey) { return ''; }
      return utils.pubkeyToAddress(pubkey);
    },
  }));
  const scrollBox = React.useRef<HTMLDivElement>(null);

  const loadingDetector = useLoadingDetector(async () => {
    const { done, loading } = linkGroupService.state.post;
    if (done || loading) { return false; }
    const posts = await linkGroupService.post.list();
    return !!posts;
  });

  const handleCreatePost = async () => {
    const post = await createPost({ groupId: state.groupId, bookId: '', bookGroupId: state.bookGroupId });
    if (post && !linkGroupService.state.post.userAddress && linkGroupService.state.post.order === 'time') {
      runInAction(() => {
        linkGroupService.state.post.ids.unshift(post.id);
      });
    }
  };

  const handleEditProfile = async () => {
    const groupId = state.groupId;
    const userAddress = linkGroupService.state.post.userAddress;
    await linkGroupService.profile.get(groupId, userAddress);
    const profile = linkGroupService.state.profile.mapByAddress.get(`${groupId}-${userAddress}`);
    editProfile({ profile, groupId });
  };

  const handleBackTpTop = () => {
    scrollBox.current!.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSetSort = action((sort: 'time' | 'hot') => {
    state.sort = sort;
    linkGroupService.post.list({
      groupId: state.groupId,
      order: state.sort,
    });
  });

  React.useEffect(() => {
    linkGroupService.post.list({
      groupId: state.groupId,
      order: state.sort,
    });
  }, []);

  const showUserNameBox = !!linkGroupService.state.post.userAddress
    && ((state.loading && !!state.posts.length) || !state.loading);

  return (
    <div
      className={classNames(
        'flex-col items-stretch bg-gray-f7 relative',
        props.className,
      )}
    >
      <div className="flex-col gap-6 absolute right-6 bottom-6">
        <IconButton
          className="!bg-black hover:!bg-black/80 text-white w-12 h-12 z-10"
          onClick={handleCreatePost}
          color="inherit"
        >
          <Create className="text-24" />
        </IconButton>
        <IconButton
          className="border border-solid border-black/30 hover:!bg-black/10 text-black/50 w-12 h-12 z-10"
          onClick={handleBackTpTop}
          color="inherit"
        >
          <ArrowUpward className="text-26" />
        </IconButton>
      </div>

      <Scrollable className="flex-1 h-0" scrollBoxRef={scrollBox}>
        <div className="p-8">
          <div className="absolute left-1/2 -translate-x-1/2 h-0 w-full mx-auto px-8">
            <div className="relative max-w-[740px] mx-auto">
              {!linkGroupService.state.post.userAddress && (
                <div className="flex-col absolute -left-4 -translate-x-full bg-white p-3 gap-2">
                  <button
                    className={classNames(
                      'flex items-center gap-1 text-left',
                      state.sort !== 'time' && 'text-black/30',
                      state.sort === 'time' && 'font-bold !border-black/25 text-black/80',
                    )}
                    onClick={() => handleSetSort('time')}
                  >
                    <BiTime />
                    {lang.linkGroup.latest}
                  </button>
                  <button
                    className={classNames(
                      'flex items-center gap-1 text-left',
                      state.sort !== 'hot' && 'text-black/30',
                      state.sort === 'hot' && 'font-bold !border-black/25 text-black/80',
                    )}
                    onClick={() => handleSetSort('hot')}
                  >
                    <AiOutlineFire />
                    {lang.linkGroup.hot}
                  </button>
                </div>
              )}
            </div>
          </div>

          {showUserNameBox && (
            <div className="flex gap-4 max-w-[740px] mx-auto border border-black/40 py-5 px-6 mb-8 bg-white relative">
              <IconButton
                className="absolute -left-4 top-0 -translate-x-full border border-solid border-black/10 w-10 h-10 z-10 text-black/40"
                color="inherit"
                onClick={() => linkGroupService.post.list({
                  groupId: state.groupId,
                  order: 'time',
                })}
              >
                <ChevronLeft />
              </IconButton>
              <div className="flex flex-center">
                <UserAvatar
                  groupId={state.groupId}
                  userAddress={linkGroupService.state.post.userAddress}
                  size={64}
                  showSyncing={state.linkGroupUserAddress === linkGroupService.state.post.userAddress}
                />
              </div>
              <div className="flex-col justify-center text-18 font-bold text-black/70">
                <UserName groupId={state.groupId} userAddress={linkGroupService.state.post.userAddress} />
              </div>
              <div className="flex-1" />
              {state.linkGroupUserAddress === linkGroupService.state.post.userAddress && (
                <div className="flex">
                  <Button
                    className="self-center"
                    variant="outlined"
                    onClick={handleEditProfile}
                  >
                    {lang.linkGroup.editProfile}
                  </Button>
                </div>
              )}
            </div>
          )}

          {!state.loading && !state.posts.length && !linkGroupService.state.post.userAddress && (
            <div className="flex flex-center p-12 text-black/50">
              {lang.linkGroup.noPostYet}
            </div>
          )}

          {!!state.posts.length && (<>
            <div className="flex-col gap-4 justify-center items-stretch max-w-[740px] mx-auto">
              {state.posts.map((post) => (
                <PostItem
                  post={post}
                  key={post.id}
                  myUserAddress={state.linkGroupUserAddress}
                />
              ))}
            </div>

            <loadingDetector.Component offset={400} />
          </>)}

          {state.loading && (
            <div className="flex flex-center p-4">
              <CircularProgress className="text-gray-af" />
            </div>
          )}
        </div>
      </Scrollable>
    </div>
  );
});
