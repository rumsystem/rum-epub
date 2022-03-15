import 'epubjs/types/annotations';

declare module 'epubjs/types/annotations'{
  interface Annotation {
    type: string
    cfiRange: string
  }
}
