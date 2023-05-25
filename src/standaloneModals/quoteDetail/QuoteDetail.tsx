import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';

import { Button, Dialog } from '@mui/material';
import { RiThumbUpFill, RiThumbUpLine } from 'react-icons/ri';
import { FaRegComment } from 'react-icons/fa';
import { FiCopy } from 'react-icons/fi';
import { BiCommentDetail } from 'react-icons/bi';

import MarkerIcon from '~/assets/icon_marker.svg?fill';
import { HighlightItem, Post, bookService, dialogService, linkGroupService, nodeService, tooltipService } from '~/service';
import { lang, notNullFilter, setClipboard } from '~/utils';
import { Ago, Scrollable, UserAvatar, UserName } from '~/components';

import { postDetail } from '../postDetail';
import { createPost } from '../createPost';
import { groupLink } from '../groupLink';

export interface PropsPost {
  post: Post & { children?: Array<Post> }
  groupId: string
}

export interface PropsRange {
  range: string
  text: string
  groupId: string
  bookId: string
}

export interface ReapplyAnnotationProps {
  onReapplyAnnotation: () => unknown
}

export type Props = (PropsPost | PropsRange) & ReapplyAnnotationProps;

type SelfProps = Partial<PropsPost & PropsRange> & ReapplyAnnotationProps;
export interface InternalProps {
  destroy: () => unknown
}
export const QuoteDetail = observer((props: InternalProps & SelfProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

  const bookId = props.post?.bookId || props.bookId!;
  const groupId = props.groupId!;
  const linkedGroupId = nodeService.state.groupLink[groupId];
  const linkedGroup = nodeService.state.groupMap[linkedGroupId];
  const range = props.post?.quoteRange || props.range!;
  const highlighted = bookService.state.highlight.local.some((v) => v.cfiRange === range);
  const text = props.post?.quote || props.text!;
  const handleClose = action(() => {
    state.open = false;
    setTimeout(props.destroy, 2000);
  });

  const handleCreatePost = async () => {
    if (!linkedGroup) {
      const result = await dialogService.open({
        content: lang.linkGroup.noCommentSeednetLinked,
        confirm: lang.linkGroup.goLink,
      });
      if (result === 'confirm') {
        groupLink({ groupId });
        handleClose();
      }
      return;
    }
    createPost({
      groupId,
      bookId,
      chapter: props.post?.chapter,
      chapterId: props.post?.chapterId,
      quote: text,
      quoteRange: range,
    });
  };

  const handleToggleHighlight = async () => {
    if (!highlighted) {
      const item: HighlightItem = {
        groupId: bookService.state.current.groupId,
        bookId,
        cfiRange: range,
        text,
      };
      await bookService.highlight.save(item);
      runInAction(() => {
        bookService.state.highlight.local.push(item);
      });
    } else {
      const index = bookService.state.highlight.local.findIndex((v) => v.cfiRange === range);
      if (index !== -1) {
        runInAction(() => {
          bookService.state.highlight.local.splice(index, 1);
        });
        await bookService.highlight.delete(bookService.state.current.groupId, bookId, range);
      }
    }
    props.onReapplyAnnotation();
  };

  const posts = [...props.post?.children ?? [], props.post].filter(notNullFilter);

  return (
    <Dialog maxWidth={false} open={state.open} onClose={handleClose}>
      <Scrollable className="w-[700px] min-h-[700px]">
        <div className="flex-col gap-y-4 bg-white p-8">
          <div className="border-l-[3px] border-slate-800/25 pl-3 text-16 text-black/80 leading-relaxed">
            {text}
          </div>

          <div className="flex items-center mb-4 gap-2">
            <Button
              className="flex items-center gap-[6px] px-2 py-[2px] text-14 text-black/50 hover:text-black/80 min-w-0"
              variant="text"
              size="small"
              onClick={() => {
                setClipboard(text);
                tooltipService.show({ content: lang.copied });
              }}
            >
              <FiCopy className="text-20" />
              {lang.copy}
            </Button>
            <Button
              className="flex items-center gap-[6px] px-2 py-[2px] text-14 text-black/50 hover:text-black/80 min-w-0"
              variant="text"
              size="small"
              onClick={handleCreatePost}
            >
              <BiCommentDetail className="text-20 -mb-[2px]" />
              {lang.linkGroup.writePost}
            </Button>
            <Button
              className="flex items-center gap-[6px] px-2 py-[2px] text-14 text-black/50 hover:text-black/80 min-w-0"
              variant="text"
              size="small"
              onClick={handleToggleHighlight}
            >
              <MarkerIcon className="text-20" />
              <span className={classNames(highlighted && 'font-bold')}>
                {highlighted && lang.epubHighlights.marked}
                {!highlighted && lang.epubHighlights.mark}
              </span>
            </Button>
          </div>

          {!posts.length && (
            <div className="flex flex-center text-black/30">
              {lang.epubHighlights.noPostsYet}
            </div>
          )}

          {posts.map((v) => (
            <div
              className="flex-col gap-y-2 border py-3 px-4 rounded"
              key={v.id}
            >
              <div className="flex items-center gap-2 -ml-px">
                <UserAvatar groupId={v.groupId} userAddress={v.userAddress} size={32} />
                <div className="flex items-center gap-3 relative">
                  <span className="font-bold text-black/60">
                    <UserName groupId={v.groupId} userAddress={v.userAddress} />
                  </span>
                  <span className="text-black/40 text-12">
                    <Ago timestamp={v.timestamp} />
                  </span>
                </div>
              </div>

              <div className="text-black/80">
                {v.content}
              </div>

              <div className="flex items-center -ml-2">
                <Button
                  className="flex items-center gap-[6px] px-2 py-[2px] text-12 text-black/50 hover:text-black/80 min-w-0"
                  variant="text"
                  size="small"
                  onClick={() => linkGroupService.counter.update(v, v.liked ? 'undolike' : 'like')}
                >
                  <div className="text-17">
                    {v.liked && <RiThumbUpFill />}
                    {!v.liked && <RiThumbUpLine />}
                  </div>
                  {!!v.likeCount && v.likeCount}
                  {!v.likeCount && lang.linkGroup.like}
                </Button>
                <Button
                  className="flex items-center gap-[6px] px-2 py-[2px] text-12 text-black/50 hover:text-black/80 min-w-0"
                  variant="text"
                  size="small"
                  onClick={() => postDetail({ groupId: v.groupId, postId: v.id })}
                >
                  <div className="text-17">
                    <FaRegComment />
                  </div>
                  {v.commentCount || lang.linkGroup.comment}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Scrollable>
    </Dialog>
  );
});
