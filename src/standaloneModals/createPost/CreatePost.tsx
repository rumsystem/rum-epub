import { useMemo } from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Dialog, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { utils } from 'rum-sdk-browser';
import { Post, bookService, linkGroupService, nodeService, tooltipService } from '~/service';
import { lang, runLoading } from '~/utils';
import { BookCoverImg, UserAvatar, UserName } from '~/components';

export interface Props {
  groupId: string
  bookGroupId?: string
  bookId?: string
  chapter?: string
  chapterId?: string
  quote?: string
  quoteRange?: string
}
export interface InternalProps {
  destroy: () => unknown
  rs: (post?: Post) => unknown
}
export const CreatePost = observer((props: InternalProps & Props) => {
  const state = useLocalObservable(() => ({
    content: '',
    open: true,
    loading: false,
    noChapter: false,
    bookId: props.bookId ?? '',
  }));

  const handleClose = action(() => {
    state.open = false;
    props.rs();
    setTimeout(action(() => {
      props.destroy();
    }), 2000);
  });

  const handleSubmit = () => {
    const content = state.content.trim();
    if (!content) {
      tooltipService.show({
        content: lang.linkGroup.emptyPostTip,
        type: 'warning',
      });
      return;
    }
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const post = await linkGroupService.post.create({
          groupId: props.groupId,
          bookId: state.bookId || props.bookId,
          content,
          ...props.chapter && props.chapterId ? {
            chapter: props.chapter,
            chapterId: props.chapterId,
          } : {},
          ...props.quote && props.quoteRange ? {
            quote: props.quote,
            quoteRange: props.quoteRange,
          } : {},
        });
        props.rs(post);
        handleClose();
      },
    );
  };

  const group = nodeService.state.groupMap[props.groupId];

  const myUserAddress = useMemo(() => {
    const group = nodeService.state.groups.find((v) => v.group_id === props.groupId);
    if (!group) { return ''; }
    return utils.pubkeyToAddress(group.user_pubkey);
  }, [props.groupId]);

  const books = bookService.state.groupMap.get(props.bookGroupId ?? '') ?? [];
  const book = books.find((v) => v.book.id === (props.bookId || state.bookId));

  return (
    <Dialog open={state.open} onClose={handleClose}>
      <div className="flex-col items-stretch gap-y-4 bg-white rounded-0 p-6 max-w-[550px]">
        {!props.bookId && (
          <div className="flex-col gap-1">
            <div className="text-black/80">
              选择书籍
            </div>
            <Select
              className="w-[500px]"
              MenuProps={{ className: 'w-[500px]' }}
              value={state.bookId}
              renderValue={(v) => {
                const book = books.find((u) => u.book.id === v);
                return (
                  <div className="flex items-center gap-2 text-14">
                    {!book && (
                      <div className="flex items-center h-8">无</div>
                    )}
                    {!!book && (<>
                      <BookCoverImg
                        className="rounded-lg shadow-1 w-8 h-8"
                        groupId={book.book.groupId}
                        bookId={book.book.id}
                      />
                      <div className="text-black/40 truncate">
                        <span className="text-black/70 mr-2">
                          {book.book.title}
                        </span>
                      </div>
                    </>)}
                  </div>
                );
              }}
              displayEmpty
              onChange={action((e: SelectChangeEvent) => { state.bookId = e.target.value; })}
              size="small"
            >
              <MenuItem className="text-14" value="">
                <div className="flex items-center h-8">无</div>
              </MenuItem>

              {books.map((v) => (
                <MenuItem
                  className="gap-2 text-14"
                  key={v.book.id}
                  value={v.book.id}
                >
                  <BookCoverImg
                    className="rounded-lg shadow-1 w-8 h-8"
                    groupId={v.book.groupId}
                    bookId={v.book.id}
                  />
                  <div className="text-black/40 truncate">
                    <span className="text-black/70 mr-2">
                      {v.book.title}
                    </span>
                  </div>
                </MenuItem>
              ))}
            </Select>
          </div>
        )}

        {!!book && (
          <div>
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
                <div className="flex items-stretch w-full">
                  <div className="flex-1 w-0 truncate">
                    <span className="font-medium text-14 text-black">
                      {book.book.title}
                    </span>
                    {' '}
                    <span className="text-12 text-black/40">
                      {book.metadata?.metadata.author}
                    </span>
                  </div>
                </div>

                {!state.noChapter && !!props.chapter && !!props.chapterId && (
                  <div className="flex-col items-start w-full">
                    <div className="flex w-full">
                      <div className="flex-1 w-0 truncate text-black/40">
                        {props.chapter}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* {!state.noChapter && !!props.chapter && !!props.chapterId && (
              <div className="ml-14">
                <Button
                  className="px-1 py-px mt-1 -ml-1 text-12"
                  onClick={action(() => {
                    state.noChapter = true;
                  })}
                  size="small"
                  variant="text"
                >
                  <AiFillCloseCircle className="mr-1 opacity-40 text-16 -mt-px" />
                  {lang.linkGroup.noChapter}
                </Button>
              </div>
            )} */}

            {!!props.quote && !!props.quoteRange && (
              <div className="line-clamp-3 ml-14 mt-1 text-12 text-black/40 border-l-[3px] pl-2">
                {props.quote}
              </div>
            )}
          </div>
        )}
        <div className="flex-col gap-3">
          <div className="flex items-center gap-2">
            <UserAvatar className="flex-none" groupId={props.groupId} userAddress={myUserAddress} size={36} />
            <UserName className="flex-none text-black/70 text-14" groupId={props.groupId} userAddress={myUserAddress} />
          </div>
          <TextField
            className="min-w-[450px] flex-1"
            inputProps={{ className: 'text-14' }}
            value={state.content}
            placeholder={lang.linkGroup.postInputPlaceholder}
            multiline
            minRows={3}
            maxRows={6}
            size="small"
            onChange={action((e) => { state.content = e.target.value; })}
          />
        </div>

        <div className="flex items-center -mt-1">
          {!!group && (
            <div className="flex flex-center gap-2 py-[5px] pl-2 pr-3 leading-none rounded-full bg-black/5 select-none">
              <div className="bg-black/25 w-3 h-3 rounded-full" />
              <span className="text-black/50 font-bold">
                {group.group_name}
              </span>
            </div>
          )}
          <div className="flex-1" />
          <LoadingButton
            className="normal-case"
            variant="contained"
            onClick={handleSubmit}
            loading={state.loading}
          >
            {lang.linkGroup.publish}
          </LoadingButton>
        </div>
      </div>
    </Dialog>
  );
});
