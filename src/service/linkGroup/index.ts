import { action, observable, reaction, runInAction } from 'mobx';
import { formatISO } from 'date-fns';
import { v4 } from 'uuid';
import { utils } from 'rum-sdk-browser';
import { postContent } from '~/apis';
import { getHotCount, runLoading, sleep } from '~/utils';
import type { CommentType, CounterType, PostType, ProfileType } from '../polling';
import { CommentRaw, Counter, Notification, PostRaw, Profile, dbService } from '../db';
import { nodeService } from '../node';
import { bookService } from '../book';

export const state = observable({
  post: {
    jobId: 0,
    ids: [] as Array<string>,
    offset: 0,
    limit: 20 as const,
    done: false,
    loading: false,
    map: new Map<string, PostRaw>(),
    groupId: '',
    bookId: '',
    userAddress: '',
    search: '',
    order: 'time' as 'hot' | 'time',
  },
  comment: {
    map: new Map<string, CommentRaw>(),
  },
  profile: {
    mapByAddress: new Map<string, Profile | null>(),
    loadingMap: new Map<string, Promise<any>>(),
  },
  counter: {
    loadingMap: new Map<string, boolean>(),
  },
  notification: {
    limit: 20 as const,
    offset: 0,
    loading: false,
    done: false,
    list: [] as Array<Notification>,
    unreadCountMap: {} as Record<string, number>,
  },
});

const post = {
  list: async (params?: {
    groupId: string
    bookId?: string
    userAddress?: string
    order?: 'hot' | 'time'
    search?: string
  }) => {
    if (params) {
      runInAction(() => {
        state.post.done = false;
        state.post.loading = false;
        state.post.ids = [];
        state.post.offset = 0;
        state.post.groupId = params.groupId ?? '';
        state.post.bookId = params.bookId ?? '';
        state.post.search = params.search ?? '';
        state.post.userAddress = params.userAddress ?? '';
        state.post.order = params.order ?? 'time';
      });
    }
    if (state.post.loading || state.post.done) { return; }
    runInAction(() => { state.post.jobId += 1; });
    const jobId = state.post.jobId;


    return runLoading(
      (l) => { state.post.loading = l; },
      async () => {
        const p = dbService.listPost({
          groupId: state.post.groupId,
          bookId: state.post.bookId,
          offset: state.post.offset,
          limit: state.post.limit,
          userAddress: state.post.userAddress,
          order: state.post.order,
          search: state.post.search,
        });
        await Promise.all([p, sleep(300)]);
        if (jobId !== state.post.jobId) { return; }
        const arr = await p;
        const posts = arr.map((v) => observable(v));

        runInAction(() => {
          posts.forEach((v) => {
            state.post.map.set(v.id, v);
          });
          state.post.offset += state.post.limit;
          state.post.done = posts.length < state.post.limit;
          posts.forEach((v) => {
            state.post.ids.push(v.id);
          });
        });

        return posts;
      },
    );
  },

  create: async (params: {
    groupId: string
    content: string
    bookId?: string
    chapter?: string
    chapterId?: string
    quote?: string
    quoteRange?: string
  }) => {
    const group = nodeService.state.groups.find((v) => v.group_id === params.groupId);
    if (!group) { throw new Error('group not found'); }
    const userAddress = utils.pubkeyToAddress(group.user_pubkey);
    const activity: PostType = {
      type: 'Create',
      object: {
        type: 'Note',
        id: v4(),
        content: params.content,
        bookId: params.bookId,
        chapterId: params.chapterId,
        quote: params.quote,
        quoteRange: params.quoteRange,
      },
      published: formatISO(new Date()),
    };

    const res = await postContent(activity, params.groupId);

    if (res) {
      const post: PostRaw = {
        trxId: res.trx_id,
        id: activity.object.id,
        title: '',
        bookId: params.bookId ?? '',
        chapter: params.chapter ?? '',
        chapterId: params.chapterId ?? '',
        quote: params.quote ?? '',
        quoteRange: params.quoteRange ?? '',
        content: params.content,
        userAddress,
        groupId: params.groupId,
        timestamp: Date.now(),
        commentCount: 0,
        nonAuthorCommentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        hotCount: 0,
        disliked: false,
        liked: false,
        status: 'pending',
        images: [],
      };
      await dbService.putPost([post]);
      runInAction(() => {
        state.post.map.set(post.id, post);
      });
      return state.post.map.get(post.id);
    }
  },

  get: async (groupId: string, id: string) => {
    if (!id) { return null; }
    const post = await dbService.getPost({
      groupId,
      id,
    });
    return post;
  },

  updateIfInStore: action((posts: Array<PostRaw>) => {
    posts.forEach((post) => {
      const postInStore = linkGroupService.state.post.map.get(post.id);
      if (postInStore && postInStore.groupId === post.groupId) {
        const clone = observable(JSON.parse(JSON.stringify(post))) as typeof post;
        linkGroupService.state.post.map.set(post.id, clone);
      }
    });
  }),
  // getStat: (post: Post) => {
  //   const [liked, likeCount] = (state.counter.post.get(post.id) ?? []).reduce<[boolean, number]>(([liked, count], c) => {
  //     if (liked && c.type === 'undolike') { return [false, count - 1]; }
  //     if (!liked && c.type === 'like') { return [true, count + 1]; }
  //     return [liked, count];
  //   }, [!!post.extra?.liked, post.likeCount]);
  //   const [disliked, dislikeCount] = (state.counter.post.get(post.id) ?? []).reduce<[boolean, number]>(([disliked, count], c) => {
  //     if (disliked && c.type === 'undodislike') { return [false, count - 1]; }
  //     if (!disliked && c.type === 'dislike') { return [true, count + 1]; }
  //     return [disliked, count];
  //   }, [!!post.extra?.disliked, post.dislikeCount]);

  //   const commentCount = post.commentCount + (state.comment.cacheByPostId.get(post.id)?.size ?? 0);

  //   return {
  //     title: post.title,
  //     content: post.content,
  //     likeCount,
  //     dislikeCount,
  //     liked,
  //     disliked,
  //     commentCount,
  //   };
  // },
};

const comment = {
  get: (groupId: string, id: string) => dbService.getComment({
    groupId,
    id,
  }),
  list: async (params: {
    groupId: string
    postId: string
    offset: number
    limit?: number
    order: 'hot' | 'time'
  }) => {
    const arr = await dbService.listComment({
      groupId: params.groupId,
      postId: params.postId,
      offset: params.offset,
      limit: params.limit ?? 20,
      order: params.order,
    });
    const comments = arr.map((v) => observable(v));
    runInAction(() => {
      comments.forEach((v) => {
        state.comment.map.set(v.id, v);
      });
    });
    return comments;
  },
  create: async (params: {
    groupId: string
    content: string
    post: PostRaw
    /** reply to comment */
    comment?: CommentRaw
  }) => {
    const group = nodeService.state.groups.find((v) => v.group_id === params.groupId);
    if (!group) { throw new Error('group not found'); }
    const userAddress = utils.pubkeyToAddress(group.user_pubkey);
    const activity: CommentType = {
      type: 'Create',
      object: {
        type: 'Note',
        id: v4(),
        content: params.content,
        inreplyto: {
          type: 'Note',
          id: params.comment?.id || params.comment?.postId || params.post.id,
        },
      },
      published: formatISO(new Date()),
    };
    const res = await postContent(activity, params.groupId);

    if (res) {
      const comment: CommentRaw = {
        trxId: res.trx_id,
        id: activity.object.id,
        title: '',
        postId: params.post.id,
        threadId: params.comment?.threadId || params.comment?.id || '',
        replyTo: params.comment?.id || '',
        content: params.content,
        userAddress,
        groupId: params.groupId,
        timestamp: Date.now(),
        commentCount: 0,
        nonAuthorCommentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
        hotCount: 0,
        disliked: false,
        liked: false,
        status: 'pending',
        images: [],
      };
      runInAction(() => {
        params.post.commentCount += 1;
        if (params.comment) {
          params.comment.commentCount += 1;
        }
      });
      await dbService.putComment([comment]);
      await dbService.updateObjectCounter({
        object: params.post,
        commentCount: 1,
      });
      if (params.comment) {
        await dbService.updateObjectCounter({
          object: params.comment,
          commentCount: 1,
        });
      }
      runInAction(() => {
        state.comment.map.set(comment.id, comment);
      });
      return state.comment.map.get(comment.id);
    }
  },
  updateIfInStore: action((comments: Array<CommentRaw>) => {
    comments.forEach((comment) => {
      const commentInStore = linkGroupService.state.comment.map.get(comment.id);
      if (commentInStore && commentInStore.groupId === comment.groupId) {
        const clone = observable(JSON.parse(JSON.stringify(comment))) as typeof comment;
        linkGroupService.state.comment.map.set(comment.id, clone);
      }
    });
  }),
  // list: async (postId: string) => {
  //   const comments = await CommentApi.list(state.groupId, {
  //     objectId: postId,
  //     viewer: keyService.state.address,
  //     offset: 0,
  //     limit: 500,
  //   });
  //   if (!comments) {
  //     return null;
  //   }
  //   runInAction(() => {
  //     comments.forEach((comment) => {
  //       if (comment.extra?.userProfile.trxId) {
  //         profile.save(comment.extra.userProfile);
  //       }
  //       state.comment.map.set(comment.id, comment);
  //     });
  //   });
  //   const commentIds = comments.map((comment) => comment.id);
  //   const postSet = state.comment.cacheByPostId.get(postId);
  //   if (postSet) {
  //     for (const cachedId of postSet) {
  //       commentIds.push(cachedId);
  //     }
  //   }
  //   return commentIds;
  // },
  // create: async (params: { objectId: string, threadId: string, replyId: string, content: string }) => {
  //   const activity: CommentType = {
  //     type: 'Create',
  //     object: {
  //       type: 'Note',
  //       content: params.content,
  //       id: v4(),
  //       inreplyto: {
  //         type: 'Note',
  //         id: params.replyId || params.threadId || params.objectId,
  //       },
  //     },
  //   };
  //   const res = await trx.create(activity, 'comment');
  //   if (res) {
  //     const comment: Comment = {
  //       id: activity.object.id,
  //       content: params.content,
  //       postId: params.objectId,
  //       threadId: params.threadId,
  //       replyId: params.replyId,
  //       userAddress: keyService.state.address,
  //       groupId: state.groupId,
  //       trxId: res.trx_id,
  //       commentCount: 0,
  //       likeCount: 0,
  //       dislikeCount: 0,
  //       timestamp: Date.now(),
  //     };

  //     runInAction(() => {
  //       state.comment.map.set(comment.id, comment);
  //       if (!state.comment.cacheByPostId.has(params.objectId)) {
  //         state.comment.cacheByPostId.set(params.objectId, new Set());
  //       }
  //       const postSet = state.comment.cacheByPostId.get(params.objectId)!;
  //       postSet.add(comment.id);
  //     });
  //     return comment;
  //   }

  //   return null;
  // },
  // get: async (id: string) => {
  //   const item = await CommentApi.get({
  //     groupId: state.groupId,
  //     id,
  //     viewer: keyService.state.address,
  //   });
  //   if (!item) { return null; }
  //   return comment.save(item);
  // },
  // getStat: (comment: Comment) => {
  //   const [liked, likeCount] = (state.counter.comment.get(comment.id) ?? []).reduce<[boolean, number]>(
  //     ([liked, count], c) => {
  //       if (liked && c.type === 'undolike') { return [false, count - 1]; }
  //       if (!liked && c.type === 'like') { return [true, count + 1]; }
  //       return [liked, count];
  //     },
  //     [!!comment.extra?.liked, comment.likeCount],
  //   );
  //   const [disliked, dislikeCount] = (state.counter.comment.get(comment.id) ?? []).reduce<[boolean, number]>(
  //     ([disliked, count], c) => {
  //       if (disliked && c.type === 'undodislike') { return [false, count - 1]; }
  //       if (!disliked && c.type === 'dislike') { return [true, count + 1]; }
  //       return [disliked, count];
  //     },
  //     [!!comment.extra?.disliked, comment.dislikeCount],
  //   );

  //   const cachedCommentCount = Array.from(state.comment.cacheByPostId.get(comment.postId)?.values() ?? []).filter((id) => {
  //     const c = state.comment.map.get(id);
  //     return c?.threadId === comment.id;
  //   }).length;
  //   const commentCount = comment.commentCount + cachedCommentCount;

  //   return {
  //     likeCount,
  //     dislikeCount,
  //     liked,
  //     disliked,
  //     commentCount,
  //   };
  // },
};

const counter = {
  update: async (item: PostRaw | CommentRaw, type: Counter['type']) => {
    const loadingKey = `${item.groupId}-${item.id}`;
    if (state.counter.loadingMap.get(loadingKey)) { return; }
    const isPost = !('postId' in item);
    const invalidAction = [
      item.liked && type === 'like',
      !item.liked && type === 'undolike',
      item.disliked && type === 'dislike',
      !item.disliked && type === 'undodislike',
    ].some((v) => v);
    if (invalidAction) { return; }
    const group = nodeService.state.groups.find((v) => v.group_id === item.groupId);
    if (!group) { return; }
    const isUndo = type === 'undolike' || type === 'undodislike';
    const likeType = type === 'like' || type === 'undolike' ? 'Like' : 'Dislike';
    const now = Date.now();
    const published = formatISO(now);
    try {
      const acvitity: CounterType = isUndo
        ? {
          type: 'Undo',
          object: {
            type: likeType,
            object: {
              type: 'Note',
              id: item.id,
            },
          },
          published,
        }
        : {
          type: likeType,
          object: {
            type: 'Note',
            id: item.id,
          },
          published,
        };
      runInAction(() => {
        if (likeType === 'Like') {
          item.liked = !isUndo;
          item.likeCount += isUndo ? -1 : 1;
        }
        if (likeType === 'Dislike') {
          item.disliked = !isUndo;
          item.dislikeCount += isUndo ? -1 : 1;
        }
        item.hotCount = getHotCount(item);
      });
      const res = await postContent(acvitity, item.groupId);
      if (res) {
        await runLoading(
          (l) => {
            if (l) {
              state.counter.loadingMap.set(loadingKey, true);
            } else {
              state.counter.loadingMap.delete(loadingKey);
            }
          },
          async () => {
            await dbService.putCounter([{
              groupId: item.groupId,
              objectId: item.id,
              objectType: isPost ? 'post' : 'comment',
              timestamp: now,
              trxId: res.trx_id,
              type,
              status: 'pending',
              userAddress: utils.pubkeyToAddress(group.user_pubkey),
            }]);
            await dbService.updateObjectCounter({
              object: item,
              ...likeType === 'Like' ? { likeCount: isUndo ? -1 : 1 } : { dislikeCount: isUndo ? -1 : 1 },
              ...likeType === 'Like' ? { liked: !isUndo } : { disliked: !isUndo },
            });
          },
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  },
};

const profile = {
  get: (groupId: string, userAddress: string): Promise<Profile | null> => {
    const key = `${groupId}-${userAddress}`;
    const loadingItem = state.profile.loadingMap.get(key);
    if (loadingItem) { return loadingItem; }
    const run = async () => {
      try {
        const profile = await dbService.getProfile({ groupId, userAddress }) ?? null;
        runInAction(() => {
          state.profile.mapByAddress.set(key, profile);
        });
        return state.profile.mapByAddress.get(key) ?? null;
      } finally {
        runInAction(() => {
          state.profile.loadingMap.delete(key);
        });
      }
    };
    const p = run();
    state.profile.loadingMap.set(key, p);
    return p;
  },
  submit: async (params: {
    name: string
    avatar?: { mediaType: string, content: string }
    groupId: string
  }) => {
    const group = nodeService.state.groupMap[params.groupId];
    if (!group) { return; }
    const timestamp = Date.now();
    const userAddress = utils.pubkeyToAddress(group.user_pubkey);
    const avatar = params.avatar && {
      type: 'Image' as const,
      content: params.avatar.content,
      mediaType: params.avatar.mediaType,
    };
    const activity: ProfileType = {
      type: 'Create',
      object: {
        type: 'Profile',
        name: params.name,
        ...avatar ? { image: avatar } : {},
        describes: {
          type: 'Person',
          id: userAddress,
        },
      },
      published: formatISO(timestamp),
    };

    const res = await postContent(activity, params.groupId);

    if (res) {
      const profile: Profile = {
        trxId: res.trx_id,
        userAddress,
        groupId: params.groupId,
        name: params.name,
        avatar,
        timestamp,
        status: 'pending',
      };
      await dbService.putProfile([profile]);
      runInAction(() => {
        state.profile.mapByAddress.set(`${profile.groupId}-${profile.userAddress}`, profile);
      });
    }
  },
};

const notification = {
  getUnreadCount: async (groupId: string) => {
    const count = await dbService.getNotificationUnreadCount(groupId);
    runInAction(() => {
      state.notification.unreadCountMap[groupId] = count;
    });
  },
  addUnreadCount: action((notifications: Array<Notification>) => {
    notifications.forEach((v) => {
      state.notification.unreadCountMap[v.groupId] = (state.notification.unreadCountMap[v.groupId] ?? 0) + 1;
    });
  }),
  list: (params: Parameters<typeof dbService.listNotification>[0]) => {
    const items = dbService.listNotification(params);
    return items;
  },
  clearUnread: async (groupId: string) => {
    await dbService.clearUnreadNotification(groupId);
    runInAction(() => {
      state.notification.unreadCountMap[groupId] = 0;
    });
  },
};

const init = () => {
  const disposes = [
    reaction(
      () => bookService.state.current.linkGroupId,
      () => {
        state.post.done = false;
        state.post.loading = false;
        state.post.ids = [];
        state.post.offset = 0;
        state.post.groupId = '';
        state.post.bookId = '';
        state.post.search = '';
        state.post.userAddress = '';
        state.post.order = 'time';
        state.post.map.clear();
        state.comment.map.clear();
        state.profile.mapByAddress.clear();
        state.profile.loadingMap.clear();
        state.counter.loadingMap.clear();
        state.notification.list = [];
        state.notification.done = false;
        state.notification.loading = false;
        state.notification.offset = 0;

        if (bookService.state.current.linkGroupId) {
          notification.getUnreadCount(bookService.state.current.linkGroupId);
        }
      },
    ),
  ];

  return () => disposes.forEach((v) => v());
};

export const linkGroupService = {
  init,
  state,
  post,
  comment,
  counter,
  profile,
  notification,
};
