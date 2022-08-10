import React from 'react';
import classNames from 'classnames';
import { action, observable, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import DOMPurify from 'dompurify';
import { createRoot } from 'react-dom/client';
import { useTable, useResizeColumns, useFlexLayout } from 'react-table';
import {
  Checkbox,
  CircularProgress,
  Fade,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Tooltip,
} from '@mui/material';
import { ChevronLeft, Close, EditOutlined, Search } from '@mui/icons-material';
import GridAltIcon from 'boxicons/svg/regular/bx-grid-alt.svg?fill-icon';
import ListUlIcon from 'boxicons/svg/regular/bx-list-ul.svg?fill-icon';
import TrashIcon from 'boxicons/svg/regular/bx-trash.svg?fill-icon';

import IconFold from '~/assets/fold.svg?react';
import IconLib from '~/assets/icon_lib.svg?fill';
import { ThemeRoot } from '~/utils/theme';
import {
  epubService,
  dialogService,
  escService,
  loadingService,
  nodeService,
  tooltipService,
  GroupBookItem,
} from '~/service';
import { Scrollable } from '~/components';
import { lang } from '~/utils';
import { editEpubCover } from '../editEpupCover';
import { editEpubMetadata } from '../editEpubMetadata';

export const myLibraryState = observable({
  closeCurrent: null as null | (() => unknown),
  get opened() {
    return !!this.closeCurrent;
  },
});

export const myLibrary = async () => new Promise<void>((rs) => {
  if (myLibraryState.closeCurrent) { myLibraryState.closeCurrent(); return; }
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
        <MyLibrary
          rs={() => {
            rs();
            setTimeout(unmount, 3000);
          }}
        />
      </ThemeRoot>
    ),
  );
});

interface LibBookItem { groupId: string, book: GroupBookItem }

const MyLibrary = observer((props: { rs: () => unknown }) => {
  const state = useLocalObservable(() => ({
    open: false,
    loading: true,
    books: [] as Array<LibBookItem>,
    sidebarCollapsed: false,
    languageFilter: [] as Array<string>,
    subjectFilter: [] as Array<string>,
    nameFilter: '',
    viewMode: 'grid' as 'grid' | 'list',
    sort: 'added' as 'added' | 'opened',
    selectedBook: null as null | LibBookItem,
    dispose: escService.noop,
    get allSubjects() {
      const list = Array.from(new Set(state.books.flatMap((v) => v.book.metadata?.subjects ?? [])));
      list.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
      return list;
    },
    get allLanguages() {
      const allLangs = Array.from(new Set(
        state.books.flatMap((v) => v.book.metadata?.languages ?? '').filter(Boolean),
      ));
      allLangs.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
      return allLangs;
    },
    get filteredBooks() {
      const filteredBooks = this.books.filter((v) => {
        const languageMatch = this.languageFilter.length
          ? v.book.metadata && v.book.metadata.languages.some((v) => this.languageFilter.some((u) => u === v))
          : true;
        const subjectMatch = this.subjectFilter.length
          ? v.book.metadata && v.book.metadata.subjects.some((v) => this.subjectFilter.some((u) => u === v))
          : true;
        const words = state.nameFilter.split(' ').map((v) => v.toLowerCase());
        const nameFilter = words.every((word) => v.book.fileInfo.title.toLowerCase().includes(word));
        return languageMatch && nameFilter && subjectMatch;
      });
      if (this.sort === 'added') {
        filteredBooks.sort((a, b) => b.book.time - a.book.time);
      }
      if (this.sort === 'opened') {
        filteredBooks.sort((a, b) => b.book.openTime - a.book.openTime);
      }
      return filteredBooks;
    },
  }));

  const columns = React.useMemo(
    () => [
      {
        Header: lang.myLib.title,
        width: 240,
        minWidth: 80,
        accessor: (row: LibBookItem) => {
          const title = [
            row.book.fileInfo.title,
            row.book.metadata?.subTitle
              ? ` - ${row.book.metadata?.subTitle}`
              : '',
          ].join('');
          return (
            <Tooltip title={title} placement="bottom" disableInteractive>
              <div
                className="font-medium cursor-pointer"
                onClick={action(() => { state.selectedBook = row; })}
              >
                {title}
              </div>
            </Tooltip>
          );
        },
      },
      {
        Header: lang.myLib.author,
        width: 240,
        minWidth: 80,
        accessor: (row: LibBookItem) => [
          row.book.metadata?.author,
          row.book.metadata?.translator
            ? `${lang.epub.translatorTag}${row.book.metadata?.translator}`
            : '',
        ].join(''),
      },
      {
        Header: lang.myLib.tags,
        width: 160,
        accessor: (row: LibBookItem) => {
          const tags = row.book.metadata?.subjects.join(', ') ?? '';
          if (!tags) { return null; }
          return (
            <Tooltip title={tags} placement="bottom" disableInteractive>
              <div className="whitespace-nowrap overflow-hidden">
                {tags}
              </div>
            </Tooltip>
          );
        },
      },
      {
        Header: lang.myLib.size,
        width: 60,
        accessor: (row: LibBookItem) => Number((row.book.size / 1048576).toFixed(2)),
      },
      {
        Header: lang.myLib.format,
        width: 80,
        accessor: () => 'epub',
      },
      {
        Header: lang.myLib.rating,
        width: 80,
        accessor: () => '暂无',
      },
      {
        Header: lang.myLib.oparation,
        width: 80,
        accessor: (row: LibBookItem) => (
          <div className="flex flex-center">
            <TrashIcon
              className="text-20 text-[#5fc0e9] cursor-pointer"
              onClick={() => handleLeaveGroup(row.groupId)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  const tableInstance = useTable(
    {
      data: state.filteredBooks,
      columns,
    },
    useFlexLayout,
    useResizeColumns,
  );

  const handleChangeLanguageFilter = action((lang: string, checked: boolean) => {
    let langs = [...state.languageFilter];
    if (!checked) {
      langs = langs.filter((v) => v !== lang);
    } else {
      langs = [...langs, lang];
    }
    langs = langs.filter((v) => state.allLanguages.some((u) => u === v));
    state.languageFilter = langs;
  });

  const handleChangeSubjectFilter = action((sub: string, checked: boolean) => {
    let langs = [...state.subjectFilter];
    if (!checked) {
      langs = langs.filter((v) => v !== sub);
    } else {
      langs = [...langs, sub];
    }
    langs = langs.filter((v) => state.allSubjects.some((u) => u === v));
    state.subjectFilter = langs;
  });

  const handleOpenDetailView = action((book: LibBookItem) => {
    if (state.selectedBook === book) {
      state.selectedBook = null;
    } else {
      state.selectedBook = book;
    }
  });

  const handleClose = action(() => {
    props.rs();
    state.open = false;
    myLibraryState.closeCurrent = null;
    state.dispose();
  });

  const handleOpenBook = action((v: LibBookItem) => {
    epubService.openBook(v.groupId, v.book.trxId);
    handleClose();
  });

  const handleLeaveGroup = async (groupId: string) => {
    const result = await dialogService.open({
      content: lang.myLib.leaveGroup,
      danger: true,
    });
    if (result === 'cancel') { return; }
    const loading = loadingService.add(lang.group.exitingGroup);
    nodeService.leaveGroup(groupId).then(
      () => {
        tooltipService.show({
          content: lang.group.exited,
        });
      },
      (err) => {
        console.error(err);
        tooltipService.show({
          content: lang.somethingWrong,
          type: 'error',
        });
      },
    ).finally(() => {
      loading.close();
    });
  };

  const loadBooks = async () => {
    for (const group of nodeService.state.groups) {
      await new Promise<void>((rs) => epubService.loadAndParseBooks(group.group_id, rs));
    }

    runInAction(() => {
      const books = Array.from(epubService.state.groupMap.entries())
        .flatMap(([groupId, item]) => item.books.map((book) => ({
          groupId,
          book,
        })));
      state.books = books;
      state.loading = false;
    });
  };

  React.useEffect(() => {
    myLibraryState.closeCurrent = handleClose;
    loadBooks();
    runInAction(() => { state.open = true; });
    state.dispose = escService.add(handleClose);
  }, []);

  return (
    <Fade
      in={state.open}
      timeout={300}
      mountOnEnter
      unmountOnExit
    >
      <div className="flex items-stretch fixed inset-0 top-[40px] bg-gray-f7 z-50">
        <div className="relative">
          <div
            className={classNames(
              'sidebar-toggle flex-col justify-center items-center gap-y-2 py-4',
              'absolute right-0 translate-x-full -translate-y-1/2 top-1/4',
              'z-10 rounded-r-xl cursor-pointer',
              'w-[22px] min-h-[60px]',
              state.sidebarCollapsed && 'text-white bg-black',
              !state.sidebarCollapsed && 'text-black bg-white',
            )}
            style={{
              boxShadow: '0 1px 6px 0 rgba(0, 0, 0, 0.16)',
            }}
            onClick={action(() => { state.sidebarCollapsed = !state.sidebarCollapsed; })}
          >
            <IconFold
              className={classNames(
                '',
                !state.sidebarCollapsed && 'rotate-180',
              )}
            />
            {state.sidebarCollapsed && (
              <div className="leading-tight">
                {lang.myLib.filter.split('').flatMap(([v, i]) => [v, <br key={i} />]).slice(0, -1)}
              </div>
            )}
          </div>
          <div
            className={classNames(
              'relative bg-white w-[240px] flex-none p-8 h-full z-20',
              state.sidebarCollapsed && 'hidden',
            )}
            style={{
              boxShadow: '-4px 2px 4px 3px rgba(0,0,0,.2),-4px 4px 5px 4px rgba(0,0,0,.14),-4px 1px 10px 4px rgba(0,0,0,.12)',
            }}
          >
            <div className="text-18 font-medium">
              {lang.myLib.contentType}
            </div>
            <div className="text-16 font-medium my-1">
              {'<< '}{lang.myLib.bookCategories}
            </div>
            <div className="flex-col py-3 pl-4 overflow-hidden">
              {state.allSubjects.map((sub, i) => (
                <Tooltip title={sub} placement="right" key={i}>
                  <FormControlLabel
                    className="-mt-3"
                    key={i}
                    control={(
                      <Checkbox
                        size="small"
                        checked={state.subjectFilter.some((v) => v === sub)}
                        onChange={action((e, v) => handleChangeSubjectFilter(sub, v))}
                      />
                    )}
                    label={(<span className="text-12 break-all whitespace-nowrap">{sub}</span>)}
                  />
                </Tooltip>
              ))}
            </div>

            {/* <div className="text-14 font-medium mt-6">
              {lang.myLib.rating}
            </div>
            <div>
              ★★★★★
            </div> */}

            <div className="text-14 font-medium mt-6">
              {lang.myLib.language}
            </div>
            <div className="flex-col py-3 pl-4">
              {state.allLanguages.map((lang) => (
                <FormControlLabel
                  className="-mt-3"
                  key={lang}
                  control={(
                    <Checkbox
                      size="small"
                      checked={state.languageFilter.some((v) => v === lang)}
                      onChange={action((e, v) => handleChangeLanguageFilter(lang, v))}
                    />
                  )}
                  label={(<span className="text-12">{lang}</span>)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-col items-stretch flex-1">
          <div className="flex justify-between items-center border-b border-gray-99 py-4 px-8">
            <div className="flex items-center gap-x-4">
              <ChevronLeft
                className="text-34 -ml-5 -mr-2 text-gray-33 cursor-pointer"
                onClick={handleClose}
              />
              <IconLib />
              <span>
                <span className="text-20 text-gray-9c font-medium">
                  {lang.myLib.myLib}
                </span>
                <span className="text-20 text-black font-medium">
                  {lang.myLib.books}
                </span>
              </span>
              <OutlinedInput
                size="small"
                value={state.nameFilter}
                onChange={action((e) => { state.nameFilter = e.target.value; })}
                endAdornment={<Search className="text-gray-4a" />}
              />
              <FormControl size="small" variant="standard">
                <InputLabel
                  className="text-14"
                  classes={{
                    shrink: 'text-16 transition-all',
                  }}
                >
                  {lang.myLib.sort}
                </InputLabel>
                <Select
                  className="min-w-[120px] text-14"
                  label={lang.myLib.sort}
                  value={state.sort}
                  onChange={action((e: SelectChangeEvent<unknown>) => { state.sort = e.target.value as any; })}
                >
                  <MenuItem value="added">{lang.myLib.recentAdd}</MenuItem>
                  <MenuItem value="opened">{lang.myLib.recentOpen}</MenuItem>
                </Select>
              </FormControl>
            </div>
            <div className="flex gap-x-4">
              <button
                className={classNames(
                  'flex flex-center gap-x-1 p-1 border-b-2',
                  state.viewMode !== 'grid' && 'border-transparent',
                  state.viewMode === 'grid' && 'border-bright-orange',
                )}
                onClick={action(() => { state.viewMode = 'grid'; })}
              >
                <GridAltIcon className="text-16" />
                <span className="text-15">
                  {lang.myLib.coverMode}
                </span>
              </button>
              <button
                className={classNames(
                  'flex flex-center gap-x-1 p-1 border-b-2',
                  state.viewMode !== 'list' && 'border-transparent',
                  state.viewMode === 'list' && 'border-bright-orange',
                )}
                onClick={action(() => { state.viewMode = 'list'; })}
              >
                <ListUlIcon className="text-20" />
                <span className="text-15">
                  {lang.myLib.listMode}
                </span>
              </button>
            </div>
          </div>
          {state.loading && (
            <div className="flex flex-center flex-1">
              <CircularProgress className="text-gray-bd" />
            </div>
          )}
          {!state.loading && !state.books.length && (
            <div className="flex-col flex-center flex-1">
              <div className="flex flex-center flex-1 grow-[3] text-gray-4a text-center text-16 font-bold">
                {lang.myLib.emptyTip.map((v, i) => (
                  <div className={i !== 0 ? 'mt-4' : ''} key={i}>
                    {v}
                  </div>
                ))}
              </div>
              <div className="flex-1 grow-[2]" />
            </div>
          )}
          {!state.loading && !!state.books.length && (
            <div className="flex items-stretch flex-1 h-0">
              {state.viewMode === 'grid' && (
                <Scrollable className="flex-1">
                  <div
                    className="grid p-10 gap-x-15 gap-y-8 justify-center"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, 150px)',
                    }}
                  >
                    {state.filteredBooks.map((v) => (
                      <div className="flex-col items-center" key={v.book.trxId}>
                        <div
                          className={classNames(
                            'relative group w-[150px] h-[200px] cursor-pointer',
                            'from-black/10 via-black/20 to-black/40 bg-gradient-to-b bg-cover bg-center',
                          )}
                          style={{
                            backgroundImage: v.book.cover ? `url("${v.book.cover}")` : undefined,
                          }}
                          onClick={(e) => e.target === e.currentTarget && handleOpenDetailView(v)}
                        >
                          <div
                            className="absolute hidden right-0 top-0 p-1 group-hover:block bg-white/50 hover:bg-white/75"
                            onClick={() => handleLeaveGroup(v.groupId)}
                          >
                            <TrashIcon className="text-20 text-[#5fc0e9]" />
                          </div>
                        </div>
                        <div
                          className="text-14 font-bold text-center mt-2 cursor-pointer"
                          onClick={() => handleOpenDetailView(v)}
                        >
                          {v.book.fileInfo.title}
                        </div>
                        <div
                          className="text-12 text-gray-88 cursor-pointer"
                          onClick={() => handleOpenDetailView(v)}
                        >
                          {v.book.metadata?.author}
                          {v.book.metadata?.translator && ` ${lang.epub.translatorTag}${v.book.metadata?.translator}`}
                        </div>
                        <div
                          className="text-12 text-nice-blue cursor-pointer"
                          onClick={() => handleOpenBook(v)}
                        >
                          epub {Number((v.book.size / 1048576).toFixed(2))}MB
                        </div>
                      </div>
                    ))}
                  </div>
                </Scrollable>
              )}
              {state.viewMode === 'list' && (
                <div className="flex flex-1 p-4">
                  <div
                    className="flex-col flex-1 w-0 max-h-[100%] overflow-x-auto px-1"
                    {...tableInstance.getTableProps()}
                  >
                    <div className="border-b border-black">
                      {tableInstance.headerGroups.map((headerGroup) => (
                        // eslint-disable-next-line react/jsx-key
                        <div
                          className="divide-x divide-gray-de"
                          {...headerGroup.getHeaderGroupProps()}
                        >
                          {headerGroup.headers.map((column: any) => (
                            // eslint-disable-next-line react/jsx-key
                            <div
                              className="relative px-2 py-3 text-center"
                              {...column.getHeaderProps()}
                            >
                              {column.render('Header')}
                              <div
                                className={classNames(
                                  'w-2 h-full z-20 absolute right-0 top-0 translate-x-1/2',
                                  // column.isResizing && 'bg-red-400',
                                )}
                                {...column.getResizerProps()}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <Scrollable>
                      <div
                        className="divide-y divide-gray-de"
                        {...tableInstance.getTableBodyProps()}
                      >
                        {tableInstance.rows.map((row) => {
                          tableInstance.prepareRow(row);
                          return (
                            // eslint-disable-next-line react/jsx-key
                            <div
                              className="divide-x divide-gray-de"
                              {...row.getRowProps()}
                            >
                              {row.cells.map((cell) => (
                                // eslint-disable-next-line react/jsx-key
                                <div
                                  className="relative px-2 py-4"
                                  {...cell.getCellProps()}
                                >
                                  {cell.render('Cell')}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </Scrollable>
                  </div>
                </div>
              )}
              {!!state.selectedBook && (
                <Scrollable className="bg-gray-33 w-[350px] relative" light>
                  <button
                    className="absolute right-0 top-0 p-2"
                    onClick={action(() => { state.selectedBook = null; })}
                  >
                    <Close className="text-white" />
                  </button>
                  <div className="flex-none text-white px-10 py-8">
                    <div
                      className={classNames(
                        'w-[270px] h-[360px] cursor-pointer border-2 border-gray-f2',
                        'from-white/60 via-white/45 to-white/20 bg-gradient-to-b bg-cover bg-center',
                      )}
                      style={{
                        backgroundImage: state.selectedBook.book.cover ? `url("${state.selectedBook.book.cover}")` : undefined,
                      }}
                      onClick={() => state.selectedBook && handleOpenBook(state.selectedBook)}
                    />
                    <div className="flex justify-between text-bright-orange mt-5">
                      <button
                        className="flex items-center text-14"
                        onClick={() => editEpubCover(state.selectedBook!.groupId, state.selectedBook!.book.trxId)}
                      >
                        <EditOutlined className="text-16 mr-1" />
                        {lang.epub.editCover}
                      </button>
                      <button
                        className="flex items-center text-14"
                        onClick={() => editEpubMetadata(state.selectedBook!.groupId, state.selectedBook!.book.trxId)}
                      >
                        <EditOutlined className="text-16 mr-1" />
                        {lang.epub.editMetadata}
                      </button>
                    </div>
                    <div
                      className="text-center text-18 font-bold my-4"
                      onClick={() => state.selectedBook && handleOpenBook(state.selectedBook)}
                    >
                      《{state.selectedBook.book.fileInfo.title}》
                    </div>
                    <div className="">
                      {[
                        { name: lang.epubMetadata.subTitle, text: state.selectedBook.book.metadata?.subTitle },
                        { name: lang.epubMetadata.isbn, text: state.selectedBook.book.metadata?.isbn },
                        { name: lang.epubMetadata.author, text: state.selectedBook.book.metadata?.author },
                        { name: lang.epubMetadata.translator, text: state.selectedBook.book.metadata?.translator },
                        { name: lang.epubMetadata.publishDate, text: state.selectedBook.book.metadata?.publishDate },
                        { name: lang.epubMetadata.publisher, text: state.selectedBook.book.metadata?.publisher },
                        { name: lang.epubMetadata.languages, text: state.selectedBook.book.metadata?.languages },
                        { name: lang.epubMetadata.series, text: state.selectedBook.book.metadata?.series },
                        { name: lang.epubMetadata.seriesNumber, text: state.selectedBook.book.metadata?.seriesNumber },
                        // { name: lang.epubMetadata.wordCount, text: state.selectedBook.book.metadata?.seriesNumber },
                      ].map((v, i) => (
                        <div className="leading-relaxed mt-px" key={i}>
                          <span className="text-gray-af">{v.name}</span>
                          {v.text}
                        </div>
                      ))}
                    </div>

                    {!!state.selectedBook.book.metadata?.description && (
                      <div className="flex mt-6">
                        <div
                          className="mylib-detail-desc max-w-[100%] flex-1 w-0"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(state.selectedBook.book.metadata?.description ?? '') }}
                        />
                      </div>
                    )}
                    <style>
                      {'.mylib-detail-desc * { font-size: 14px !important; }'}
                    </style>
                  </div>
                </Scrollable>
              )}
            </div>
          )}

        </div>
        {/* <div className="flex-col flex-center flex-1 h-0 p-12">
          <div className="overflow-auto w-[800px]">
            hi
          </div>
        </div> */}
      </div>
    </Fade>
  );
});
