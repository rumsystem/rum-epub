import { Book } from 'epubjs';
import React from 'react';

import { createConfirmDialogStore } from 'store/confirmDialog';

export const highLightRange = (book: Book, cfiRange: string, confirmDialogStore: ReturnType<typeof createConfirmDialogStore>) => {
  book.rendition.annotations.highlight(
    cfiRange,
    {},
    async (e: MouseEvent) => {
      const cfiRange = (e.target as HTMLElement).dataset.epubcfi!;
      const range = await book.getRange(cfiRange);
      const text = range.toString();

      confirmDialogStore.show({
        content: (
          <span className="text-left block">
            {text}
            <br />
            <br />
            确定要移除这段标记吗？
          </span>
        ),
        okText: '移除',
        ok: () => {
          book.rendition.annotations.remove(cfiRange, 'highlight');
          confirmDialogStore.hide();
        },
      });
    },
    'rum-annotation-hl',
  );
};
