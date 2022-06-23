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
import { dialogService, epubService, tooltipService } from '~/service';
import { postContent } from '~/apis';
import { lang, runLoading } from '~/utils';
import { format } from 'date-fns';

export const editEpubMetadata = async () => new Promise<void>((rs) => {
  if (!epubService.state.current.bookTrx) {
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
    bookTrx: '',
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
    get descLength() {
      const size = Array.from(this.form.description)
        .map((v) => (v.charCodeAt(0) > 256 ? 1 : 0.5))
        .reduce((p, c) => p + c, 0);
      return Math.ceil(size);
    },
    get formValid() {
      return this.descLength <= 340;
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
          content: lang.epubMetadata.closeConfirm,
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
    const groupId = state.groupId;
    const data = {
      type: 'Add',
      object: {
        id: state.bookTrx,
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
                content: lang.epubMetadata.submitFailed,
                type: 'error',
              });
            },
            () => {
              tooltipService.show({
                content: lang.epubMetadata.submitted,
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
        await epubService.loadAndParseBooks(state.groupId);
        await epubService.parseMetadataAndCover(state.groupId, state.bookTrx);
        const book = epubService.state.groupMap.get(state.groupId)?.books.find((v) => v.trxId === state.bookTrx);
        const metadata = book?.metadata ?? null;
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
    if (!epubService.state.current.bookTrx) {
      handleClose();
      return;
    }
    runInAction(() => {
      state.groupId = epubService.state.current.groupId;
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
          {lang.epubMetadata.editMetadata}
        </div>

        <div
          className="grid gap-y-3 mt-4 w-[600px]"
          style={{
            gridTemplateColumns: '100px 1fr',
          }}
        >
          <div className="text-left text-16 leading-loose">{lang.epubMetadata.subTitle}</div>
          <div>
            <OutlinedInput
              className="w-full text-14"
              size="small"
              value={state.form.subTitle}
              onChange={action((e) => { state.form.subTitle = e.target.value; })}
            />
          </div>

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.isbn}</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                {lang.epubMetadata.isbnTip}
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.isbn}
                label={lang.epubMetadata.isbnTip}
                onChange={action((e) => { state.form.isbn = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.author}</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                {lang.epubMetadata.autherTip}
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.author}
                label={lang.epubMetadata.autherTip}
                onChange={action((e) => { state.form.author = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.translator}</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                {lang.epubMetadata.traslatorTip}
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.translator}
                label={lang.epubMetadata.traslatorTip}
                onChange={action((e) => { state.form.translator = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.publishDate}</div>
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

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.publisher}</div>
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
              <div className="text-left text-16 leading-loose">
                {lang.epubMetadata.languageWithIndex(i > 0 && i + 1)}
              </div>
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
                    {i === 0 && lang.epubMetadata.addLanguage(2)}
                    {i === 1 && lang.epubMetadata.addLanguage(3)}
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.tags}</div>
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
                    <span className="text-14">{lang.epubMetadata.tagsNoColon}</span>
                  )}
                />
              )}
            />
          </div>

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.series}</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                {lang.epubMetadata.seriesTip}
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.series}
                label={lang.epubMetadata.seriesTip}
                onChange={action((e) => { state.form.series = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.seriesNumber}</div>
          <div>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                {lang.epubMetadata.seriesNumberTip}
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.seriesNumber}
                label={lang.epubMetadata.seriesNumberTip}
                onChange={action((e) => { state.form.seriesNumber = e.target.value; })}
              />
            </FormControl>
          </div>

          <div className="text-left text-16 leading-loose">{lang.epubMetadata.categoryLevel}</div>
          <div className="flex gap-x-4">
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                {lang.epubMetadata.categoryLevel1}
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.categoryLevel1}
                label={lang.epubMetadata.categoryLevel1}
                onChange={action((e) => { state.form.categoryLevel1 = e.target.value; })}
              />
            </FormControl>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                {lang.epubMetadata.categoryLevel2}
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.categoryLevel2}
                label={lang.epubMetadata.categoryLevel2}
                onChange={action((e) => { state.form.categoryLevel2 = e.target.value; })}
              />
            </FormControl>
            <FormControl className="w-full" variant="outlined" size="small">
              <InputLabel className="text-14">
                {lang.epubMetadata.categoryLevel3}
              </InputLabel>
              <OutlinedInput
                className="w-full text-14"
                value={state.form.categoryLevel3}
                label={lang.epubMetadata.categoryLevel3}
                onChange={action((e) => { state.form.categoryLevel3 = e.target.value; })}
              />
            </FormControl>
          </div>
          <div className="flex text-16 self-stretch">{lang.epubMetadata.description}</div>
          <div className="relative">
            <OutlinedInput
              className="w-full text-14"
              size="small"
              multiline
              minRows={3}
              maxRows={6}
              placeholder={lang.epubMetadata.descriptionNoColon}
              value={state.form.description}
              onChange={action((e) => { state.form.description = e.target.value; })}
              error={state.descLength > 340}
            />
            <div
              className={classNames(
                'text-right',
                state.descLength <= 340 && 'text-gray-bd',
                state.descLength > 340 && 'text-red-400',
              )}
            >
              {state.descLength} / 340
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
            {lang.operations.closeWindow}
          </Button>
          <Button
            className="py-[6px] px-8 text-16 rounded-full"
            size="large"
            onClick={handleSubmit}
            disabled={!state.formValid}
          >
            {lang.epubMetadata.submitChanges}
          </Button>
        </div>
      </div>
    </Dialog>
  );
});
