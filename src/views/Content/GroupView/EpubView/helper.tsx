import { Book, EpubCFI, NavItem } from 'epubjs';
import { EpubCFIComponent } from 'epubjs/types/epubcfi';
import { Post } from '~/service';
import { quoteDetail } from '~/standaloneModals';

interface HighLightRangeParams {
  groupId: string
  bookId: string
  cfiRange: string
  book: Book
  temp?: boolean
  post?: Post & { children?: Array<Post> }
  onReapplyAnnotation: () => unknown
  onReloadHighlights: () => unknown
}

export const highLightRange = (params: HighLightRangeParams) => {
  const { post, book, bookId, cfiRange, groupId, onReapplyAnnotation, onReloadHighlights, temp } = params;
  const type = post ? 'underline' : 'highlight';
  book.rendition.annotations[type](
    cfiRange,
    {},
    async (e: MouseEvent) => {
      const cfiRange = (e.target as HTMLElement).dataset.epubcfi!;
      if (temp) {
        book.rendition.annotations.remove(cfiRange, type);
        return;
      }
      if (post) {
        quoteDetail({ post, groupId, onReapplyAnnotation, onReloadHighlights });
        return;
      }
      const range = await book.getRange(cfiRange);
      const text = range.toString();

      quoteDetail({ range: cfiRange, text, bookId, groupId, onReapplyAnnotation, onReloadHighlights });
    },
    'rum-annotation-hl',
    {
      'data-annotation-type': type,
    },
  );
};

export const chapterSearch = (chapters: Array<NavItem>, targetHref: string): Array<NavItem> | undefined => {
  for (const v of chapters) {
    const href = v.href.replace(/#.*/, '');
    if (targetHref === href) {
      return [v];
    }
    if (v.subitems) {
      const childMatch = chapterSearch(v.subitems, targetHref);
      if (childMatch) {
        return [v, ...childMatch];
      }
    }
  }
};

declare module 'epubjs' {
  interface EpubCFI {
    path: EpubCFIComponent
    start: EpubCFIComponent
    end: EpubCFIComponent
    spinePos: number
    range: boolean
  }
}

export const cfiRangeOverlap = (cfi1: EpubCFI | string, cfi2: EpubCFI | string) => {
  // Compare Spine Positions
  const cfiA = typeof cfi1 === 'string' ? new EpubCFI(cfi1) : cfi1;
  const cfiB = typeof cfi2 === 'string' ? new EpubCFI(cfi2) : cfi2;
  if (cfiA.spinePos !== cfiB.spinePos) {
    return false;
  }
  if (!cfiA.range || !cfiB.range) {
    return false;
  }

  const aStart = {
    steps: cfiA.path.steps.concat(cfiA.start.steps),
    terminal: cfiA.start.terminal,
  };
  const aEnd = {
    steps: cfiA.path.steps.concat(cfiA.end.steps),
    terminal: cfiA.end.terminal,
  };
  const bStart = {
    steps: cfiB.path.steps.concat(cfiB.start.steps),
    terminal: cfiB.start.terminal,
  };
  const bEnd = {
    steps: cfiB.path.steps.concat(cfiB.end.steps),
    terminal: cfiB.end.terminal,
  };

  // return x1 <= y2 && y1 <= x2;
  return compareCfi(aStart, bEnd) <= 0 && compareCfi(bStart, aEnd) <= 0;
};


interface CompareCfiItem {
  steps: EpubCFIComponent['steps']
  terminal: EpubCFIComponent['terminal']
}

const compareCfi = (a: CompareCfiItem, b: CompareCfiItem) => {
  const stepsA = a.steps;
  const stepsB = b.steps;
  // Compare Each Step in the First item
  for (let i = 0; i < stepsA.length; i += 1) {
    if (!stepsA[i]) {
      return -1;
    }
    if (!stepsB[i]) {
      return 1;
    }
    if (stepsA[i].index > stepsB[i].index) {
      return 1;
    }
    if (stepsA[i].index < stepsB[i].index) {
      return -1;
    }
    // Otherwise continue checking
  }

  // All steps in First equal to Second and First is Less Specific
  if (stepsA.length < stepsB.length) {
    return -1;
  }

  // Compare the character offset of the text node
  if (a.terminal.offset > b.terminal.offset) {
    return 1;
  }
  if (a.terminal.offset < b.terminal.offset) {
    return -1;
  }

  // CFI's are equal
  return 0;
};
