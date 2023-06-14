import React from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import DOMPurify from 'dompurify';
import { Popover, PopoverProps } from '@mui/material';
import { Close, EditOutlined } from '@mui/icons-material';
import { bookService, i18n } from '~/service';
import { editEpubMetadata, editEpubCover } from '~/standaloneModals';
import { lang } from '~/utils';
import { BookCoverImg, Scrollable } from '~/components';
import RemoveMarkdown from 'remove-markdown';

interface Props extends PopoverProps {
  groupId: string
  bookId: string
}

export const EpubInfoPopup = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    bgSize: {
      width: 270,
      height: 360,
    },
    get book() {
      const item = bookService.state.groupMap.get(props.groupId)?.find((v) => v.book.id === props.bookId);
      return item;
    },
  }));

  const handleClose = (e: React.MouseEvent) => {
    props.onClose?.(e, 'backdropClick');
  };

  const handleCoverLoad = action((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const width = 270 - 4;
    const height = 360 - 4;
    const ratio = Math.abs(width / img.naturalWidth) < Math.abs(height / img.naturalHeight)
      ? width / img.naturalWidth
      : height / img.naturalHeight;
    runInAction(() => {
      state.bgSize = {
        width: img.naturalWidth * ratio,
        height: img.naturalHeight * ratio,
      };
    });
  });

  const { groupId, bookId, ...rest } = props;
  const title = state.book?.book.title;
  const metadata = state.book?.metadata?.metadata;
  const epubDesc = React.useMemo(
    () => DOMPurify.sanitize(RemoveMarkdown(metadata?.description || lang.epub.noDescription)),
    [metadata?.description],
  );

  return (
    <Popover
      {...rest}
      classes={{
        ...rest.classes,
        paper: classNames(rest.classes?.paper, 'rounded-none'),
      }}
    >
      <div className="text-white">
        <div className="flex flex-center relative bg-black h-11">
          <span className="text-18">
            {i18n.state.lang === 'cn' && '《'}
            {title}
            {i18n.state.lang === 'cn' && '》'}
          </span>

          <Close
            className="absolute right-2 cursor-pointer"
            onClick={handleClose}
          />
        </div>
        <div className="flex bg-gray-33 p-6 gap-x-10">
          <div className="w-[270px] flex-none">
            <div>
              <BookCoverImg
                groupId={props.groupId}
                bookId={props.bookId}
              >
                {(src) => (
                  <div
                    className="border-2 border-gray-ec bg-cover bg-no-repeat bg-center flex flex-center h-[360px] max-w-[270px] bg-contain"
                  >
                    {!!src && (
                      <img
                        className=""
                        src={src}
                        alt=""
                        style={{
                          width: `${state.bgSize.width}px`,
                          height: `${state.bgSize.height}px`,
                        }}
                        onLoad={handleCoverLoad}
                      />
                    )}
                    {!src && (
                      <span className="text-gray-bd text-14 select-none">
                        {lang.epub.noCover}
                      </span>
                    )}
                  </div>
                )}
              </BookCoverImg>
            </div>
            <div className="flex justify-between text-bright-orange mt-5">
              <button
                className="flex items-center text-14"
                onClick={(e) => {
                  handleClose(e);
                  editEpubCover({
                    groupId: bookService.state.current.groupId,
                    bookId: bookService.state.current.bookId,
                  });
                }}
              >
                <EditOutlined className="text-16 mr-1" />
                {lang.epub.editCover}
              </button>
              <button
                className="flex items-center text-14"
                onClick={(e) => {
                  handleClose(e);
                  editEpubMetadata({
                    groupId: bookService.state.current.groupId,
                    bookId: bookService.state.current.bookId,
                  });
                }}
              >
                <EditOutlined className="text-16 mr-1" />
                {lang.epub.editMetadata}
              </button>
            </div>
          </div>

          <div className="w-[250px] flex-col relative flex-none self-stretch overflow-hidden flex-col -mr-4">
            <div className="absolute inset-0">
              <Scrollable className="w-full h-full" light>
                <div className="overflow-hidden pr-4">
                  {epubDesc}
                </div>
              </Scrollable>
            </div>
          </div>

          <div className="w-[250px] flex-none leading-relaxed">
            {[
              { text: lang.epubMetadata.subTitle, value: metadata?.subTitle },
              { text: lang.epubMetadata.isbn, value: metadata?.isbn },
              { text: lang.epubMetadata.author, value: metadata?.author },
              { text: lang.epubMetadata.translator, value: metadata?.translator },
              { text: lang.epubMetadata.publishDate, value: metadata?.publishDate },
              { text: lang.epubMetadata.publisher, value: metadata?.publisher },
              { text: lang.epubMetadata.languages, value: metadata?.languages.join('') },
              { text: lang.epubMetadata.series, value: metadata?.series },
              { text: lang.epubMetadata.seriesNumber, value: metadata?.seriesNumber },
              { text: lang.epubMetadata.categoryLevel, value: [metadata?.categoryLevel1, metadata?.categoryLevel2, metadata?.categoryLevel3].filter(Boolean).join(' - ') },
              // { text: lang.epubMetadata.wordCount, value: '25.6 万' },
              // { text: lang.epubMetadata.rating, value: '暂时不做不显示' },
              // { text: lang.epubMetadata.tags, value: '加缪, 哲学 暂时不做不显示' },
            ].map((v, i) => (
              <div key={i}>
                <span className="text-gray-af">{v.text} </span>
                <span className="text-white break-all">{v.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Popover>
  );
});
