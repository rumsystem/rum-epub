import React from 'react';
import classNames from 'classnames';
import { createRoot } from 'react-dom/client';
import * as TE from 'fp-ts/lib/TaskEither';
import { identity, pipe } from 'fp-ts/lib/function';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { action, runInAction } from 'mobx';
import { Autocomplete, Button, FormControl, IconButton, InputLabel, OutlinedInput, Popover, TextField } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers';
import { AddCircleOutline, CalendarMonth, DeleteOutline } from '@mui/icons-material';

import { Dialog } from '~/components';
import { ThemeRoot } from '~/utils/theme';
import { dialogService, EpubItem, epubService, nodeService, tooltipService } from '~/service';
import { postContent } from '~/apis';
import { runLoading } from '~/utils';
import { format } from 'date-fns';

export const editEpubMetadata = async () => new Promise<void>((rs) => {
  if (!epubService.state.currentBookItem) {
    return;
  }
  const div = document.createElement('div');
  const root = createRoot(div);
  document.body.append(div);
  const unmount = () => {
    root.unmount();
    div.remove();
  };
  root.render(
    (
      <ThemeRoot>
        <EditEpubMetadata
          rs={() => {
            rs();
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

interface Props {
  rs: () => unknown
}

const EditEpubMetadata = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    open: true,
    loading: false,
    submitting: false,
    groupId: '',
    bookItem: null as null | EpubItem,
    publisherDatePicker: false,

    form: {
      description: '',
      subTitle: '',
      isbn: '',
      author: '',
      translator: '',
      publishDate: '',
      publisher: '',
      languages: [''] as Array<string>,
      subjects: [] as Array<string>,
      series: '',
      seriesNumber: '',
      categoryLevel1: '',
      categoryLevel2: '',
      categoryLevel3: '',
    },
    initialForm: {} as any,
    get seriesNumberValid() {
      const n = this.form.seriesNumber;
      const nn = Number(n);
      const valid = String(nn) === n && nn >= 1 && nn <= 100;
      return !n || valid;
    },
    get formValid() {
      return this.form.description.length <= 340;
    },
  }));
  const publisherButton = React.useRef<HTMLButtonElement>(null);

  const handleClose = async (saveCheck = false) => {
    if (saveCheck) {
      const formChanged = Object.entries(state.form).some(([k, v]) => {
        if (Array.isArray(v)) {
          const isSame = v.every((u) => state.initialForm[k].includes(u))
            && state.initialForm[k].length === v.length;
          return !isSame;
        }
        return state.initialForm[k] !== v;
      });
      if (formChanged) {
        const result = await dialogService.open({
          content: '关闭窗口后，未保存的修改会丢失，确定要关闭吗？',
        });
        if (result === 'cancel') { return; }
      }
    }
    runInAction(() => {
      state.open = false;
    });
    props.rs();
  };

  const handleSubmit = async () => {
    if (!state.formValid) { return; }
    const bookItem = state.bookItem;
    if (!bookItem) { return; }
    const bookTrxId = bookItem.trxId;
    const groupId = state.groupId;
    const data = {
      type: 'Add',
      object: {
        id: bookTrxId,
        type: 'Note',
        name: 'epubMetadata',
        content: JSON.stringify(state.form),
      },
      target: {
        id: groupId,
        type: 'Group',
      },
    };
    await runLoading(
      (l) => { state.submitting = l; },
      async () => {
        await pipe(
          TE.tryCatch(() => postContent(data), identity),
          TE.matchW(
            () => {
              tooltipService.show({
                content: '提交失败！',
                type: 'error',
              });
            },
            () => {
              tooltipService.show({
                content: '内容元数据已保存修改，正在往链上提交数据，节点同步后生效',
              });
              handleClose();
            },
          ),
        )();
      },
    );
  };

  const loadBookMetadata = () => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        await epubService.parseNewTrx(state.groupId);
        await epubService.parseSubData(state.groupId, state.bookItem!.trxId);
        const book = epubService.state.groupMap.get(state.groupId)?.books.find((v) => v.trxId === state.bookItem?.trxId);
        const metadata = book?.metadata.metadata ?? null;
        runInAction(() => {
          const createForm = () => ({
            description: '',
            subTitle: '',
            isbn: '',
            author: '',
            translator: '',
            publishDate: '',
            publisher: '',
            languages: [''],
            subjects: [],
            series: '',
            seriesNumber: '',
            categoryLevel1: '',
            categoryLevel2: '',
            categoryLevel3: '',
            // eslint-disable-next-line @typescript-eslint/ban-types
            ...((metadata ?? {}) as {}),
          });
          state.form = createForm();
          state.initialForm = createForm();
          if (!state.form.languages.length) {
            state.form.languages = [''];
          }
        });
      },
    );
  };

  React.useEffect(() => {
    if (!epubService.state.currentBookItem) {
      handleClose();
      return;
    }
    runInAction(() => {
      state.groupId = nodeService.state.activeGroupId;
      state.bookItem = epubService.state.currentBookItem!;
    });
    loadBookMetadata();
  }, []);

  return (
    <Dialog
      maxWidth={false}
      open={state.open}
      onClose={() => handleClose(true)}
    >
      <div className="bg-white rounded-0 text-center p-8">
        <div className="text-22 font-bold">
          编辑元数据
        </div>

        <div
          className="grid gap-y-3 mt-4 w-[600px]"
          style={{
            gridTemplateColumns: '100px 1fr',
          }}
        >
          <div className="text-left text-16 leading-loose">副标题：</div>
          <div>
            <OutlinedInput
              className="w-full text-14"
              size="small"
              value={state.form.subTitle}
              onChange={action((e) => { state.form.subTitle = e.target.value; })}
            />
          </div>

          <div className="text-left text-16 leading-loose">ISBN：</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                非必填。但为了检索书目的准确性，ISBN号填写提交后将不可修改，请确认后再填写
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.isbn}
                label="非必填。但为了检索书目的准确性，ISBN号填写提交后将不可修改，请确认后再填写"
                onChange={action((e) => { state.form.isbn = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">作者：</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                多个人名间请使用 & 分隔。国籍用小括号，如 (法)。外国人名的分隔符请在左侧复制 ･ 使用
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.author}
                label="多个人名间请使用 & 分隔。国籍用小括号，如 (法)。外国人名的分隔符请在左侧复制 ･ 使用"
                onChange={action((e) => { state.form.author = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">译者：</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                多个人名间请使用 & 分隔
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.translator}
                label="多个人名间请使用 & 分隔"
                onChange={action((e) => { state.form.translator = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">出版日期：</div>
          <div className="flex">
            <OutlinedInput
              className="w-[240px] text-14"
              size="small"
              value={state.form.publishDate}
              onChange={action((e) => { state.form.publishDate = e.target.value; })}
              placeholder=""
              endAdornment={(
                <IconButton
                  className="-mr-2"
                  ref={publisherButton}
                  onClick={action(() => { state.publisherDatePicker = true; })}
                >
                  <CalendarMonth className="text-18" />
                </IconButton>
              )}
            />
            <Popover
              open={state.publisherDatePicker}
              onClose={action(() => { state.publisherDatePicker = false; })}
              anchorEl={publisherButton.current}
              anchorOrigin={{
                horizontal: 'right',
                vertical: 'center',
              }}
              transformOrigin={{
                horizontal: 'left',
                vertical: 'center',
              }}
            >
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <StaticDatePicker
                  displayStaticWrapperAs="desktop"
                  inputFormat="yyyy-MM-dd"
                  InputProps={{
                    className: 'text-14',
                  }}
                  value={null}
                  onChange={action((v: any) => {
                    state.form.publishDate = v instanceof Date ? format(v, 'yyyy-MM-dd') : '';
                  })}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
              </LocalizationProvider>
            </Popover>
          </div>

          <div className="text-left text-16 leading-loose">出版商：</div>
          <div>
            <OutlinedInput
              className="w-full text-14"
              size="small"
              value={state.form.publisher}
              onChange={action((e) => { state.form.publisher = e.target.value; })}
            />
          </div>

          {state.form.languages.map((v, i) => (
            <React.Fragment key={i}>
              <div className="text-left text-16 leading-loose">语言{i > 0 && i + 1}：</div>
              <div className="flex gap-x-4">
                <OutlinedInput
                  className="w-full text-14 w-80"
                  size="small"
                  value={v}
                  onChange={action((e) => { state.form.languages[i] = e.target.value; })}
                  endAdornment={i > 0 && (
                    <IconButton className="-right-2" onClick={action(() => { state.form.languages.splice(i, 1); })}>
                      <DeleteOutline className="text-18" />
                    </IconButton>
                  )}
                />
                {i === state.form.languages.length - 1 && state.form.languages.length < 3 && (
                  <button
                    className="flex flex-none items-center text-nice-blue cursor-pointer"
                    onClick={action(() => { if (state.form.languages.length < 3) { state.form.languages.push(''); } })}
                  >
                    <AddCircleOutline className="text-18 mr-1" />
                    添加第
                    {i === 0 && '二'}
                    {i === 1 && '三'}
                    种语言
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}

          <div className="text-left text-16 leading-loose">标签：</div>
          <div className="flex gap-x-4">
            <Autocomplete
              className="w-full"
              multiple
              options={[]}
              freeSolo
              size="small"
              value={state.form.subjects}
              onChange={action((_, v: any) => { state.form.subjects = v; })}
              // getOptionLabel={(option) => option.title}
              // defaultValue={[top100Films[13]]}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label={(
                    <span className="text-14">标签</span>
                  )}
                />
              )}
            />
            {/* <OutlinedInput
              className="w-full text-14 w-80"
              size="small"
              value={v}
              onChange={action((e) => { state.form.languages[i] = e.target.value; })}
              endAdornment={i > 0 && (
                <IconButton className="-right-2" onClick={action(() => { state.form.languages.splice(i, 1); })}>
                  <DeleteOutline className="text-18" />
                </IconButton>
              )}
            />
            {i === state.form.languages.length - 1 && state.form.languages.length < 3 && (
              <button
                className="flex flex-none items-center text-nice-blue cursor-pointer"
                onClick={action(() => { if (state.form.languages.length < 3) { state.form.languages.push(''); } })}
              >
                <AddCircleOutline className="text-18 mr-1" />
                添加第
                {i === 0 && '二'}
                {i === 1 && '三'}
                种语言
              </button>
            )} */}
          </div>

          <div className="text-left text-16 leading-loose">丛书：</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                本书所属的丛书
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.series}
                label="本书所属的丛书"
                onChange={action((e) => { state.form.series = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">丛书编号：</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                1~100的数字
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.seriesNumber}
                label="1~100的数字"
                onChange={action((e) => { state.form.seriesNumber = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">书籍分类：</div>
          <div className="flex gap-x-4">
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                一级分类
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.categoryLevel1}
                label="一级分类"
                onChange={action((e) => { state.form.categoryLevel1 = e.target.value; })}
              />
            </FormControl>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                二级分类
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.categoryLevel2}
                label="二级分类"
                onChange={action((e) => { state.form.categoryLevel2 = e.target.value; })}
              />
            </FormControl>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                三级分类
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.categoryLevel3}
                label="三级分类"
                onChange={action((e) => { state.form.categoryLevel3 = e.target.value; })}
              />
            </FormControl>
          </div>
          <div className="flex text-16 self-stretch">描述：</div>
          <div className="relative">
            <OutlinedInput
              className="w-full text-14"
              size="small"
              multiline
              minRows={3}
              maxRows={6}
              placeholder="描述"
              value={state.form.description}
              onChange={action((e) => { state.form.description = e.target.value; })}
              error={state.form.description.length > 340}
            />
            <div
              className={classNames(
                'text-right',
                state.form.description.length <= 340 && 'text-gray-bd',
                state.form.description.length > 340 && 'text-red-400',
              )}
            >
              {state.form.description.length} / 340
            </div>
          </div>
        </div>

        <div className="flex flex-center gap-x-40 mt-8">
          <Button
            className="py-[6px] px-8 text-16 rounded-full bg-white text-black border-solid border border-2"
            size="large"
            color="inherit"
            onClick={() => handleClose(true)}
          >
            关闭窗口
          </Button>
          <Button
            className="py-[6px] px-8 text-16 rounded-full"
            size="large"
            onClick={handleSubmit}
            disabled={!state.formValid}
          >
            提交修改
          </Button>
        </div>
      </div>
    </Dialog>
  );
});
