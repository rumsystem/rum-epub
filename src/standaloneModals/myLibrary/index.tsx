/* eslint-disable react/jsx-key */
import React from 'react';
import classNames from 'classnames';
import { action, observable, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import DOMPurify from 'dompurify';
import { createRoot } from 'react-dom/client';
import { useTable, useResizeColumns, useFlexLayout } from 'react-table';
import {
  Checkbox,
  Fade,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Tooltip,
} from '@mui/material';
import { Close, Search } from '@mui/icons-material';
import GridAltIcon from 'boxicons/svg/regular/bx-grid-alt.svg?fill-icon';
import ListUlIcon from 'boxicons/svg/regular/bx-list-ul.svg?fill-icon';
import TrashIcon from 'boxicons/svg/regular/bx-trash.svg?fill-icon';

import IconFold from '~/assets/fold.svg?react';
import IconLib from '~/assets/icon_lib.svg?fill';
import { ThemeRoot } from '~/utils/theme';
import { BookDatabaseItem, BookMetadataItem, dbService, escService } from '~/service';
import { Scrollable } from '~/components';

let canOpen = true;
export const myLibrary = async () => new Promise<void>((rs) => {
  if (!canOpen) { return; }
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

interface LibBookItem {
  book: BookDatabaseItem
  cover: string
  metadata: BookMetadataItem['metadata'] | null
}

const MyLibrary = observer((props: { rs: () => unknown }) => {
  const state = useLocalObservable(() => ({
    open: false,
    sidebarCollapsed: false,
    allBooks: [] as Array<LibBookItem>,
    coverCache: [] as Array<string>,
    languageFilter: [] as Array<string>,
    subjectFilter: [] as Array<string>,
    nameFilter: '',
    viewMode: 'grid' as 'grid' | 'list',
    selectedBook: null as null | LibBookItem,
    dispose: escService.noop,
    get allSubjects() {
      const list = Array.from(new Set(state.allBooks.flatMap((v) => v.metadata?.subjects ?? [])));
      list.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
      return list;
    },
    get allLanguages() {
      const allLangs = Array.from(new Set(
        state.allBooks.flatMap((v) => v.metadata?.languages ?? '').filter(Boolean),
      ));
      allLangs.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
      return allLangs;
    },
    get filteredBooks() {
      return this.allBooks.filter((v) => {
        const languageMatch = this.languageFilter.length
          ? v.metadata && v.metadata.languages.some((v) => this.languageFilter.some((u) => u === v))
          : true;
        const subjectMatch = this.subjectFilter.length
          ? v.metadata && v.metadata.subjects.some((v) => this.subjectFilter.some((u) => u === v))
          : true;
        const words = state.nameFilter.split(' ').map((v) => v.toLowerCase());
        const nameFilter = words.every((word) => v.book.fileInfo.title.toLowerCase().includes(word));
        return languageMatch && nameFilter && subjectMatch;
      });
    },
  }), { coverCache: observable.shallow });

  const columns = React.useMemo(
    () => [
      {
        Header: '内容标题',
        width: 240,
        minWidth: 80,
        accessor: (row: LibBookItem) => {
          const title = `${row.book.fileInfo.title}${row.metadata?.subTitle && ` - ${row.metadata?.subTitle}`}`;
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
        Header: '作者',
        width: 240,
        minWidth: 80,
        accessor: (row: LibBookItem) => `${row.metadata?.author}${row.metadata?.translator && `[译]${row.metadata?.translator}`}`,
      },
      {
        Header: '标签',
        width: 160,
        accessor: (row: LibBookItem) => {
          const tags = row.metadata?.subjects.join(', ') ?? '';
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
        Header: 'Size (MB)',
        width: 80,
        accessor: () => 'TODO',
      },
      {
        Header: '格式',
        width: 80,
        accessor: () => 'epub',
      },
      {
        Header: '评分',
        width: 80,
        accessor: () => 'TODO',
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

  const clearCache = () => {
    state.coverCache.forEach((v) => URL.revokeObjectURL(v));
    runInAction(() => {
      state.coverCache = [];
    });
  };

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
    state.selectedBook = book;
  });

  const handleClose = action(() => {
    props.rs();
    state.open = false;
    canOpen = true;
    state.dispose();
  });

  const loadBooks = async () => {
    const [books, metadata, coverBuffer] = await dbService.db.transaction(
      'r',
      [
        dbService.db.book,
        dbService.db.bookMetadata,
        dbService.db.coverBuffer,
      ],
      async () => Promise.all([
        dbService.db.book.where({ status: 'complete' }).toArray(),
        dbService.db.bookMetadata.toArray(),
        dbService.db.coverBuffer.toArray(),
      ]),
    );

    const allBooks = books.map((book) => {
      const coverFile = coverBuffer.find((v) => v.bookTrx === book.bookTrx)?.file;
      const coverBase64 = coverFile
        ? URL.createObjectURL(new Blob([coverFile]))
        : '';
      if (coverBase64) {
        state.coverCache.push(coverBase64);
      }
      const metadataItem = metadata.find((v) => v.bookTrx === book.bookTrx);
      return {
        book,
        cover: coverBase64,
        metadata: metadataItem?.metadata ?? null,
      };
    });

    runInAction(() => {
      state.allBooks = allBooks;
    });
  };

  React.useEffect(() => {
    canOpen = false;
    loadBooks();
    runInAction(() => { state.open = true; });
    state.dispose = escService.add(handleClose);
    return () => {
      clearCache();
    };
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
                筛<br />
                选<br />
                器
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
              内容类型
            </div>
            <div className="text-16 font-medium my-1">
              {'<< 书籍分类'}
            </div>
            <div className="flex-col py-3 pl-4 overflow-hidden">
              {state.allSubjects.map((sub, i) => (
                <Tooltip title={sub} placement="right">
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
              评分
            </div>
            <div>
              ★★★★★
            </div> */}

            <div className="text-14 font-medium mt-6">
              语言
            </div>
            <div className="flex-col py-3 pl-4">
              {/* {['简体中文', '英文', '繁体中文'].map((v) => ( */}
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
              <IconLib />
              <span>
                <span className="text-20 text-gray-9c font-medium">
                  我的内容库：
                </span>
                <span className="text-20 text-black font-medium">
                  书籍
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
                  排序
                </InputLabel>
                <Select
                  className="min-w-[120px] text-14"
                  label="排序"
                  onChange={() => alert('TODO:')}
                >
                  {/* TODO: */}
                  <MenuItem value="recent-added">按最新上架</MenuItem>
                  <MenuItem value="recent-opened">按最近浏览</MenuItem>
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
                  封面模式
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
                  列表管理模式
                </span>
              </button>
            </div>
          </div>
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
                    <div className="flex-col items-center" key={v.book.bookTrx}>
                      <div
                        className={classNames(
                          'relative group w-[150px] h-[200px] cursor-pointer',
                          'from-black/10 via-black/20 to-black/40 bg-gradient-to-b bg-cover bg-center',
                        )}
                        style={{
                          backgroundImage: v.cover ? `url("${v.cover}")` : undefined,
                        }}
                        onClick={(e) => e.target === e.currentTarget && handleOpenDetailView(v)}
                      >
                        <div className="absolute hidden right-0 top-0 p-1 group-hover:block bg-white/50 hover:bg-white/75">
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
                        {v.metadata?.author}
                        {v.metadata?.translator}
                      </div>
                      <div className="text-12 text-nice-blue">
                        epub size
                        {/* TODO: */}
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
                      <div
                        className="divide-x divide-gray-de"
                        {...headerGroup.getHeaderGroupProps()}
                      >
                        {headerGroup.headers.map((column: any) => (
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
                          <div
                            className="divide-x divide-gray-de"
                            {...row.getRowProps()}
                          >
                            {row.cells.map((cell) => (
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
                      backgroundImage: state.selectedBook.cover ? `url("${state.selectedBook.cover}")` : undefined,
                    }}
                    onClick={() => { /* TODO: */ }}
                  />
                  <div
                    className="text-center text-18 font-bold my-4"
                    onClick={() => { /* TODO: */ }}
                  >
                    《{state.selectedBook.book.fileInfo.title}》
                  </div>
                  <div className="">
                    {[
                      { name: '副标题', text: state.selectedBook.metadata?.subTitle },
                      { name: 'ISBN', text: state.selectedBook.metadata?.isbn },
                      { name: '作者', text: state.selectedBook.metadata?.author },
                      { name: '译者', text: state.selectedBook.metadata?.translator },
                      { name: '出版日期', text: state.selectedBook.metadata?.publishDate },
                      { name: '出版商', text: state.selectedBook.metadata?.publisher },
                      { name: '语言', text: state.selectedBook.metadata?.languages },
                      { name: '丛书', text: state.selectedBook.metadata?.series },
                      { name: '丛书编号', text: state.selectedBook.metadata?.seriesNumber },
                      // { name: '字数', text: state.selectedBook.metadata?.seriesNumber },
                      // 分类：
                      // 评分：
                      // 标签：
                    ].map((v, i) => (
                      <div className="leading-relaxed mt-px" key={i}>
                        <span className="text-gray-af">{v.name}：</span>
                        {v.text}
                      </div>
                    ))}
                  </div>

                  {!!state.selectedBook.metadata?.description && (
                    <div className="flex mt-6">
                      <div
                        className="mylib-detail-desc max-w-[100%] flex-1 w-0"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(state.selectedBook.metadata?.description ?? '') }}
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
