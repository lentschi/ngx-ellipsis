import {
  Directive,
  ElementRef,
  Renderer2,
  Input,
  Output,
  EventEmitter,
  NgZone,
  HostListener,
  OnChanges,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import elementResizeDetectorMaker from 'element-resize-detector';

/**
 * Directive to truncate the contained text, if it exceeds the element's boundaries
 * and append characters (configurable, default '...') if so.
 */
@Directive({
  selector: '[ellipsis]',
  exportAs: 'ellipsis'
})
export class EllipsisDirective implements OnChanges, OnDestroy, AfterViewInit {
  /**
   * Instance of https://github.com/wnr/element-resize-detector
   */
  private static elementResizeDetector: elementResizeDetectorMaker.Erd = null;

  /**
   * The original text (not truncated yet)
   */
  private originalText: string;

  /**
   * The referenced element
   */
  private elem: any;

  /**
   * Inner div element (will be auto-created)
   */
  private innerElem: any;

  /**
   * Whether the ellipsis should be applied on window resize
   */
  private applyOnWindowResize = false;

  /**
   * Remove function for the currently registered click listener
   * on the link `this.ellipsisCharacters` are wrapped in.
   */
  private destroyMoreClickListener: () => void;

  /**
   * The ellipsis html attribute
   * If anything is passed, this will be used as a string to append to
   * the truncated contents.
   * Else '...' will be appended.
   */
  @Input('ellipsis') ellipsisCharacters: string;

  /**
   * The ellipsis-content html attribute
   * If passed this is used as content, else contents
   * are fetched from innerHTML
   */
  @Input('ellipsis-content') ellipsisContent: string = null;

  /**
   * The ellipsis-word-boundaries html attribute
   * If anything is passed, each character will be interpreted
   * as a word boundary at which the text may be truncated.
   * Else the text may be truncated at any character.
   */
  @Input('ellipsis-word-boundaries') ellipsisWordBoundaries: string;

  /**
   * The ellipsis-resize-detection html attribute
   * Algorithm to use to detect element/window resize - any of the following:
   * 'element-resize-detector': (default) Use https://github.com/wnr/element-resize-detector with its 'scroll' strategy
   * 'element-resize-detector-object': Use https://github.com/wnr/element-resize-detector with its 'object' strategy (deprecated)
   * 'window': Only check if the whole window has been resized/changed orientation by using angular's built-in HostListener
   */
  @Input('ellipsis-resize-detection') resizeDetectionStrategy:
    '' | 'manual' | 'element-resize-detector' | 'element-resize-detector-object' | 'window';

  /**
   * The ellipsis-click-more html attribute
   * If anything is passed, the ellipsisCharacters will be
   * wrapped in <a></a> tags and an event handler for the
   * passed function will be added to the link
   */
  @Output('ellipsis-click-more') moreClickEmitter: EventEmitter<MouseEvent> = new EventEmitter();


  /**
   * The ellipsis-change html attribute
   * This emits after which index the text has been truncated.
   * If it hasn't been truncated, null is emitted.
   */
  @Output('ellipsis-change') changeEmitter: EventEmitter<number> = new EventEmitter();

  /**
   * Utility method to quickly find the largest number for
   * which `callback(number)` still returns true.
   * @param  max      Highest possible number
   * @param  callback Should return true as long as the passed number is valid
   * @return          Largest possible number
   */
  private static numericBinarySearch(max: number, callback: (n: number) => boolean): number {
    let low = 0;
    let high = max;
    let best = -1;
    let mid: number;

    while (low <= high) {
      // tslint:disable-next-line:no-bitwise
      mid = ~~((low + high) / 2);
      const result = callback(mid);
      if (!result) {
        high = mid - 1;
      } else {
        best = mid;
        low = mid + 1;
      }
    }

    return best;
  }

  /**
   * Escape html special characters
   * @param unsafe string potentially containing special characters
   * @return       escaped string
   */
  private static escapeHtml(unsafe: string): string {
    if (unsafe === undefined || unsafe === null) {
      return '';
    }

    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * The directive's constructor
   */
  public constructor(private elementRef: ElementRef, private renderer: Renderer2, private ngZone: NgZone) { }

  /**
   * Angular's init view life cycle hook.
   * Initializes the element for displaying the ellipsis.
   */
  ngAfterViewInit() {
    // let the ellipsis characters default to '...':
    if (this.ellipsisCharacters === '') {
      this.ellipsisCharacters = '...';
    }

    if (this.moreClickEmitter.observers.length > 0) {
      this.ellipsisCharacters = `<a href="#" class="ngx-ellipsis-more">${this.ellipsisCharacters}</a>`;
    }

    // perform regex replace on word boundaries:
    if (!this.ellipsisWordBoundaries) {
      this.ellipsisWordBoundaries = '';
    }
    this.ellipsisWordBoundaries = '[' + this.ellipsisWordBoundaries.replace(/\\n/, '\n').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ']';

    // store the original contents of the element:
    this.elem = this.elementRef.nativeElement;
    if (this.ellipsisContent) {
      this.originalText = EllipsisDirective.escapeHtml(this.ellipsisContent);
    } else if (!this.originalText) {
      this.originalText = this.elem.innerText;
    }

    // add a wrapper div (required for resize events to work properly):
    this.renderer.setProperty(this.elem, 'innerHTML', '');
    this.innerElem = this.renderer.createElement('div');
    this.renderer.addClass(this.innerElem, 'ngx-ellipsis-inner');
    const text = this.renderer.createText(this.originalText);
    this.renderer.appendChild(this.innerElem, text);
    this.renderer.appendChild(this.elem, this.innerElem);

    // start listening for resize events:
    this.addResizeListener(true);
  }

  /**
   * Angular's change life cycle hook.
   * Change original text (if the ellipsis-content has been passed)
   * and re-render
   */
  ngOnChanges() {
    if (!this.elem
      || typeof this.ellipsisContent === 'undefined'
      || this.originalText === EllipsisDirective.escapeHtml(this.ellipsisContent)) {
      return;
    }

    this.originalText = EllipsisDirective.escapeHtml(this.ellipsisContent);
    this.applyEllipsis();
  }

  /**
   * Angular's destroy life cycle hook.
   * Remove event listeners
   */
  ngOnDestroy() {
    this.removeAllListeners();
  }

  /**
   * remove all resize listeners
   */
  private removeAllListeners() {
    if (this.destroyMoreClickListener) {
      this.destroyMoreClickListener();
    }

    this.removeResizeListener();
  }


  /**
   * Set up an event listener to call applyEllipsis() whenever a resize has been registered.
   * The type of the listener (window/element) depends on the resizeDetectionStrategy.
   * @param triggerNow=false if true, the ellipsis is applied immediately
   */
  private addResizeListener(triggerNow = false) {
    if (typeof (this.resizeDetectionStrategy) === 'undefined') {
      this.resizeDetectionStrategy = '';
    }

    switch (this.resizeDetectionStrategy) {
      case 'manual':
        // Users will trigger applyEllipsis via the public API
        break;
      case 'window':
        this.applyOnWindowResize = true;
        break;
      case 'element-resize-detector-object':
        this.addElementResizeListener(false);
        break;
      default:
        if (typeof (console) !== 'undefined') {
          console.warn(
            `No such ellipsis-resize-detection strategy: '${this.resizeDetectionStrategy}'. Using 'element-resize-detector' instead`
          );
        }
      // tslint:disable-next-line:no-switch-case-fall-through
      case 'element-resize-detector':
      case '':
        this.addElementResizeListener();
        break;
    }

    if (triggerNow && this.resizeDetectionStrategy !== 'manual') {
      this.applyEllipsis();
    }
  }

  @HostListener('window:resize', ['$event']) onResize(event: Event) {
    this.ngZone.run(() => {
      if (this.applyOnWindowResize) {
        this.applyEllipsis();
      }
    });
  }

  /**
   * Set up an event listener to call applyEllipsis() whenever the element
   * has been resized.
   * @param scrollStrategy=true Use the default elementResizeDetector's - strategy - s. https://github.com/wnr/element-resize-detector
   */
  private addElementResizeListener(scrollStrategy = true) {
    if (!EllipsisDirective.elementResizeDetector) {
      EllipsisDirective.elementResizeDetector = elementResizeDetectorMaker({ strategy: scrollStrategy ? 'scroll' : 'object' });
    }


    let firstEvent = true;
    EllipsisDirective.elementResizeDetector.listenTo(this.elementRef.nativeElement, () => {
      if (firstEvent) {
        // elementResizeDetector fires the event directly after re-attaching the listener
        // -> discard that first event:
        firstEvent = false;
        return;
      }
      this.applyEllipsis();
    });
  }

  /**
   * Stop listening for any resize event.
   */
  private removeResizeListener() {
    if (this.resizeDetectionStrategy !== 'window') {
      if (EllipsisDirective.elementResizeDetector && this.elem) {
        EllipsisDirective.elementResizeDetector.removeAllListeners(this.elem);
      }
    } else {
      this.applyOnWindowResize = false;
    }
  }

  /**
   * Get the original text's truncated version. If the text really needed to
   * be truncated, this.ellipsisCharacters will be appended.
   * @param max the maximum length the text may have
   * @return string       the truncated string
   */
  private getTruncatedText(max: number): string {
    if (!this.originalText || this.originalText.length <= max) {
      return this.originalText;
    }

    const truncatedText = this.originalText.substr(0, max);
    if (this.ellipsisWordBoundaries === '[]' || this.originalText.charAt(max).match(this.ellipsisWordBoundaries)) {
      return truncatedText + this.ellipsisCharacters;
    }

    let i = max - 1;
    while (i > 0 && !truncatedText.charAt(i).match(this.ellipsisWordBoundaries)) {
      i--;
    }
    return truncatedText.substr(0, i) + this.ellipsisCharacters;
  }

  /**
   * Set the truncated text to be displayed in the inner div
   * @param max the maximum length the text may have
   * @param addMoreListener=false listen for click on the ellipsisCharacters if the text has been truncated
   * @returns length of remaining text (including the ellipsisCharacters if they were added)
   */
  private truncateText(max: number, addMoreListener = false): number {
    const text = this.getTruncatedText(max);
    this.renderer.setProperty(this.innerElem, 'innerHTML', text);

    if (!addMoreListener) {
      return text.length;
    }

    // Remove any existing more click listener:
    if (this.destroyMoreClickListener) {
      this.destroyMoreClickListener();
    }

    // If the text has been truncated, add a more click listener:
    if (text !== this.originalText) {
      this.destroyMoreClickListener = this.renderer.listen(this.innerElem, 'click', (e: MouseEvent) => {
        if (!e.target || (<HTMLElement> e.target).className !== 'ngx-ellipsis-more') {
          return;
        }
        e.preventDefault();
        this.moreClickEmitter.emit(e);
      });
    }

    return text.length;
  }

  /**
   * Display ellipsis in the inner div if the text would exceed the boundaries
   */
  public applyEllipsis() {
    // Remove the resize listener as changing the contained text would trigger events:
    this.removeResizeListener();

    // Find the best length by trial and error:
    const maxLength = EllipsisDirective.numericBinarySearch(this.originalText.length, curLength => {
      this.truncateText(curLength);
      return !this.isOverflowing;
    });

    // Apply the best length:
    const finalLength = this.truncateText(maxLength, (this.moreClickEmitter.observers.length > 0));

    // Re-attach the resize listener:
    this.addResizeListener();

    // Emit change event:
    if (this.changeEmitter.observers.length > 0) {
      this.changeEmitter.emit(
        (this.originalText.length === finalLength) ? null : finalLength - this.ellipsisCharacters.length
      );
    }
  }


  /**
   * Whether the text is exceeding the element's boundaries or not
   */
  private get isOverflowing(): boolean {
    // Enforce hidden overflow (required to compare client width/height with scroll width/height)
    const currentOverflow = this.elem.style.overflow;
    if (!currentOverflow || currentOverflow === 'visible') {
      this.elem.style.overflow = 'hidden';
    }

    const isOverflowing = this.elem.clientWidth < this.elem.scrollWidth - 1 || this.elem.clientHeight < this.elem.scrollHeight - 1;

    // Reset overflow to the original configuration:
    this.elem.style.overflow = currentOverflow;

    return isOverflowing;
  }
}
