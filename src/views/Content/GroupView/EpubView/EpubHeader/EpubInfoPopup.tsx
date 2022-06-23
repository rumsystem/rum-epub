import React from 'react';
import classNames from 'classnames';
import { runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import DOMPurify from 'dompurify';
import { Popover, PopoverProps } from '@mui/material';
import { Close } from '@mui/icons-material';
import FileImageIcon from 'boxicons/svg/solid/bxs-file-image.svg?fill-icon';
import EditIcon from 'boxicons/svg/solid/bxs-edit.svg?fill-icon';
import { epubService } from '~/service';
import { editEpubMetadata, editEpubCover } from '~/standaloneModals';
import { lang } from '~/utils';

interface Props extends PopoverProps {
  groupId: string
  bookTrx: string
}

export const EpubInfoPopup = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    bgSize: {
      width: 270,
      height: 360,
    },
    get bookItem() {
      const groupItem = epubService.getGroupItem(props.groupId);
      const book = groupItem.books.find((v) => v.trxId === props.bookTrx);
      return book;
    },
  }));

  const handleClose = (e: React.MouseEvent) => {
    props.onClose?.(e, 'backdropClick');
  };

  React.useEffect(() => {
    // epubService.parseSubData();
  }, []);

  React.useEffect(() => {
    const cover = state.bookItem?.cover;
    if (!cover) {
      runInAction(() => {
        state.bgSize = {
          width: 270,
          height: 360,
        };
      });
      return;
    }
    const img = new Image();
    img.src = cover;
    img.addEventListener('load', () => {
      const ratio = Math.abs(270 / img.naturalWidth) < Math.abs(360 / img.naturalHeight)
        ? 270 / img.naturalWidth
        : 360 / img.naturalHeight;
      runInAction(() => {
        state.bgSize = {
          width: img.naturalWidth * ratio,
          height: img.naturalHeight * ratio,
        };
      });
    });
    // epubService.parseSubData();
  }, [state.bookItem?.cover]);


  const { ...rest } = props;
  const title = state.bookItem?.fileInfo.title;
  const cover = state.bookItem?.cover;
  const metadata = state.bookItem?.metadata;
  const epubDesc = React.useMemo(
    () => DOMPurify.sanitize(metadata?.description || lang.epub.noDescription),
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
            《{title}》
          </span>

          <Close
            className="absolute right-2 cursor-pointer"
            onClick={handleClose}
          />
        </div>
        <div className="flex bg-gray-33 p-6 gap-x-10">
          <div className="flex-none">
            <div>
              <div
                className="border-2 border-gray-ec bg-cover bg-no-repeat bg-center flex flex-center"
                style={{
                  width: `${(state.bgSize.width + 4).toFixed(2)}px`,
                  height: `${(state.bgSize.height + 4).toFixed(2)}px`,
                  backgroundImage: cover ? `url("${cover}")` : '',
                }}
              >
                {!cover && (
                  <span className="text-gray-bd text-14 select-none">
                    {lang.epub.noCover}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-bright-orange mt-5">
              <button
                className="flex items-center text-14"
                onClick={(e) => { handleClose(e); editEpubCover(); }}
              >
                <FileImageIcon className="text-16 mr-1" />
                {lang.epub.editCover}
              </button>
              <button
                className="flex items-center text-14"
                onClick={(e) => { handleClose(e); editEpubMetadata(); }}
              >
                <EditIcon className="text-16 mr-1" />
                {lang.epub.editMetadata}
              </button>
            </div>
          </div>

          <div className="w-[250px] overflow-hidden flex-col self-stretch relative">
            <div
              className="absolute inset-0 overflow-hidden leading-snug epub-desc-box"
              dangerouslySetInnerHTML={{ __html: epubDesc }}
            />
            <style>{'.epub-desc-box * { font-size: 13px !important; }'}</style>
          </div>

          <div className="w-[250px] leading-relaxed">
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
                <span className="text-gray-af">{v.text}</span>
                <span className="text-white">{v.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Popover>
  );
});
