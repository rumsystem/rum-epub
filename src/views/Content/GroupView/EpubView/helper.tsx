import React from 'react';
import { Book } from 'epubjs';
import {
  dialogService,
  highlightTheme,
  readerSettingsService,
  bookService,
} from '~/service';
import { lang } from '~/utils';

interface HighLightRangeParams {
  groupId: string
  bookTrx: string
  cfiRange: string
  book: Book
}

export const highLightRange = (params: HighLightRangeParams) => {
  bookService.highlight.save(bookService.state.current.groupId, params.bookTrx, params.cfiRange);
  params.book.rendition.annotations.highlight(
    params.cfiRange,
    {},
    async (e: MouseEvent) => {
      const cfiRange = (e.target as HTMLElement).dataset.epubcfi!;
      const range = await params.book.getRange(cfiRange);
      const text = range.toString();

      const result = await dialogService.open({
        content: (
          <span className="text-left block">
            {text}
            <br />
            <br />
            {lang.epubHighlights.confirmDelete}
          </span>
        ),
        danger: true,
      });

      if (result === 'confirm') {
        params.book.rendition.annotations.remove(cfiRange, 'highlight');
        bookService.highlight.delete(bookService.state.current.groupId, params.bookTrx);
      }
    },
    'rum-annotation-hl',
    highlightTheme[readerSettingsService.state.theme as keyof typeof highlightTheme],
  );
};
