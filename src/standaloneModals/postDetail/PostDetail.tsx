import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';

import { Button, CircularProgress, Dialog } from '@mui/material';
import { Feedback } from '@mui/icons-material';
import { RiMoreFill, RiThumbUpFill, RiThumbUpLine } from 'react-icons/ri';
import { FaRegComment } from 'react-icons/fa';

import { Comment, Post, bookService, linkGroupService } from '~/service';
import { lang, runLoading } from '~/utils';
import { Ago, BookCoverImg, ContentSyncStatus, Scrollable, UserAvatar, UserName, ObjectMenu } from '~/components';

import { CommentSection } from './CommentSection';
import { locateCommentContext } from './locateComment';

export interface Props {
  groupId: string
  postId: string
  locateComment?: string
}
export interface InternalProps {
  destroy: () => unknown
}
export const PostDetail = observer((props: InternalProps & Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    menu: false,
    post: null as null | Post,
    comments: [] as Array<Comment>,
    loading: false,
  }));
  const contextValue = useLocalObservable(() => ({ commentId: props.locateComment ?? '' }));
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleClose = action(() => {
    state.open = false;
    setTimeout(props.destroy, 2000);
  });

  const loadPost = async () => {
    const post = await linkGroupService.post.get(props.groupId, props.postId);
    if (post) {
      runInAction(() => {
        state.post = post;
      });
    }
  };
  const loadComments = async () => {
    const comments = await linkGroupService.comment.list({
      groupId: props.groupId,
      postId: props.postId,
      order: 'time',
      offset: 0,
      limit: 500,
    });
    runInAction(() => {
      state.comments = comments;
    });
  };


  useEffect(() => {
    runLoading(
      (l) => { state.loading = l; },
      () => Promise.all([
        loadPost(),
        loadComments(),
      ]),
    );
  }, []);

  const post = state.post;
  const book = bookService.state.groupMap
    .get(bookService.state.current.groupId)
    ?.find((v) => v.book.id === post?.bookId);

  return (
    <Dialog maxWidth={false} open={state.open} onClose={handleClose}>
      <Scrollable className="w-[700px] min-h-[700px]">
        <div className="bg-white">
          {state.loading && (
            <div className="flex flex-center p-4">
              <CircularProgress />
            </div>
          )}
          {!!post && (
            <div className="flex-col gap-4 py-5 pl-5 pr-7 bg-white">
              <div className="flex gap-3">
                <UserAvatar groupId={post.groupId} userAddress={post.userAddress} size={44} />
                <div className="flex-col gap-3 mt-1 flex-1">
                  <div className="flex items-center gap-3 relative">
                    <span className="font-bold text-black/60">
                      <UserName groupId={post.groupId} userAddress={post.userAddress} />
                    </span>
                    <span className="text-black/40">
                      <Ago timestamp={post.timestamp} />
                    </span>
                  </div>

                  {!!post.content && (
                    <div className="-mt-1">
                      {post.content}
                    </div>
                  )}

                  {!!post.bookId && (
                    <div className="flex-col gap-2">
                      {!!book && (
                        <div className="flex gap-4 items-center">
                          <BookCoverImg
                            bookId={book.book.id}
                            groupId={book.book.groupId}
                          >
                            {(src) => (
                              <div
                                className="rounded-6 w-10 h-10 flex-none overflow-hidden shadow-1 bg-cover bg-center bg-gray-f7"
                                style={{ backgroundImage: `url("${src}")` }}
                              />
                            )}
                          </BookCoverImg>

                          <div className="flex-col flex-1 justify-center items-stretch">
                            <div className="flex items-stretch w-full cursor-pointer">
                              <div className="flex-1 w-0 truncate">
                                <span
                                  className="group"
                                  onClick={() => bookService.openBook({
                                    groupId: bookService.state.current.groupId,
                                    bookId: book.book.id,
                                  })}
                                >
                                  <span className="font-medium text-14 text-black/80 group-hover:text-link-blue">
                                    {book.book.title}
                                  </span>
                                  {' '}
                                  <span className="text-12 text-black/40 group-hover:text-link-blue/60">
                                    {book.metadata?.metadata.author}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {!!post.chapter && !!post.chapterId && (
                              <div className="flex-col items-start w-full cursor-pointer">
                                <div className="flex w-full">
                                  <div className="flex-1 w-0 truncate">
                                    <span
                                      className="text-black/40 hover:text-link-blue"
                                      onClick={() => bookService.openBook({
                                        groupId: bookService.state.current.groupId,
                                        bookId: book.book.id,
                                        href: post.chapterId,
                                      })}
                                    >
                                      {post.chapter}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {!book && (
                        <div className="flex gap-1 items-center text-black/40">
                          <Feedback className="text-black/20 text-16 -mb-1" />
                          {lang.linkGroup.bookNotFound} {post.bookId}
                        </div>
                      )}

                      {!!post.quote && !!post.quoteRange && (
                        <div
                          className={classNames(
                            'pl-2 border-l-[3px]',
                            'text-12 text-black/40 line-clamp-3',
                            !!book && 'hover:text-link-blue cursor-pointer',
                          )}
                          onClick={() => book && bookService.openBook({
                            groupId: bookService.state.current.groupId,
                            bookId: book.book.id,
                            href: post.quoteRange,
                          })}
                        >
                          {post.quote}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 relative -left-2">
                    <Button
                      className="flex items-center gap-[6px] px-2 py-[2px] text-12 text-black/50 hover:text-black/80 min-w-0"
                      variant="text"
                      size="small"
                      onClick={() => linkGroupService.counter.update(post, post.liked ? 'undolike' : 'like')}
                    >
                      <div className="text-17">
                        {post.liked && <RiThumbUpFill />}
                        {!post.liked && <RiThumbUpLine />}
                      </div>
                      {!!post.likeCount && post.likeCount}
                      {!post.likeCount && lang.linkGroup.like}
                    </Button>

                    <Button
                      className="flex items-center gap-[6px] px-2 py-[2px] text-12 text-black/50 hover:text-black/80 min-w-0"
                      variant="text"
                      size="small"
                    >
                      <div className="text-17">
                        <FaRegComment />
                        {/* {state.commentOpen && <FaComment />}
                        {!state.commentOpen && <FaRegComment />} */}
                      </div>
                      {post.commentCount || lang.linkGroup.comment}
                    </Button>

                    {post.status === 'synced' && (
                      <Button
                        className="flex items-center gap-[6px] px-2 py-[2px] text-black/50 hover:text-black/80 min-w-0"
                        variant="text"
                        size="small"
                        ref={menuButtonRef}
                        onClick={action(() => { state.menu = !state.menu; })}
                      >
                        <RiMoreFill className="text-20" />
                      </Button>
                    )}

                    <ContentSyncStatus className="px-2" synced={post.status === 'synced'} />

                    <ObjectMenu
                      open={state.menu}
                      anchor={menuButtonRef.current}
                      object={post}
                      onClose={action(() => { state.menu = false; })}
                      onDelete={handleClose}
                      hideOpenPostDetail
                    />
                  </div>
                </div>
              </div>

              <locateCommentContext.Provider value={contextValue}>
                <CommentSection className="ml-1" open={true} post={post} />
              </locateCommentContext.Provider>
            </div>
          )}
          {!post && !state.loading && (
            <div className="flex flex-center p-8 text-black/50">
              {lang.linkGroup.postNotFound}
            </div>
          )}
        </div>
      </Scrollable>
    </Dialog>
  );
});
