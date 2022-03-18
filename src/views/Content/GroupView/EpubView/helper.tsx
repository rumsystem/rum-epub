import React from 'react';
import { Book } from 'epubjs';
import { dialogService } from '~/service/dialog';
import { highlightTheme, readerSettingsService } from '~/service/readerSettings';
import { nodeService } from '~/service/node';
import { epubService } from '~/service/epub';

interface HighLightRangeParams {
  groupId: string
  bookTrx: string
  cfiRange: string
  book: Book
}

export const highLightRange = (params: HighLightRangeParams) => {
  epubService.saveHighlight(nodeService.state.activeGroupId, params.bookTrx, params.cfiRange);
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
            确定要移除这段标记吗？
          </span>
        ),
        danger: true,
      });

      if (result === 'confirm') {
        params.book.rendition.annotations.remove(cfiRange, 'highlight');
        epubService.deleteHighlight(nodeService.state.activeGroupId, params.bookTrx, params.cfiRange);
      }
    },
    'rum-annotation-hl',
    highlightTheme[readerSettingsService.state.theme as keyof typeof highlightTheme],
  );
};
