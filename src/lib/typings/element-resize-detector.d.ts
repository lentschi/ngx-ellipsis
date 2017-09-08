declare module 'element-resize-detector' {
  function elementResizeDetectorMaker(options?: elementResizeDetectorMaker.ErdmOptions): elementResizeDetectorMaker.Erd;

  namespace elementResizeDetectorMaker {
    interface ErdmOptions {
      strategy?: 'scroll' | 'object';
    }

    interface Erd {
      listenTo(element: HTMLElement, callback: (elem: HTMLElement) => void): void;
      removeListener(element: HTMLElement, callback: (elem: HTMLElement) => void): void;
      removeAllListeners(element: HTMLElement): void;
      uninstall(element: HTMLElement): void;
    }
  }

  export = elementResizeDetectorMaker;
}