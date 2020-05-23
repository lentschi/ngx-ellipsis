/**
 * Which detection to use for triggering ellipsis
 */
export const enum EllipsisResizeDetectionEnum {
  /**
   * Use native ResizeObserver
   * See https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
   * and https://github.com/que-etc/resize-observer-polyfill
   */
  ResizeObserver = 'resize-observer',

  /**
   * Only apply ellipsis when window has been resized
   */
  Window = 'window',

  /**
   * Disable automatic detection.
   * You'll need to call `EllipsisDirective.applyEllipsis()` manually instead whenever you see fit.
   */
  Manual = 'manual'
}
