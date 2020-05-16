import {
  Directive,
  ElementRef,
  Renderer2,
  Input,
  Output,
  EventEmitter,
  NgZone,
  OnChanges,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import elementResizeDetectorMaker from 'element-resize-detector';
import { isPlatformBrowser } from '@angular/common';

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
  private originalContent: HTMLElement;


  /**
   * The referenced element
   */
  private elem: HTMLElement;

  /**
   * Inner div element (will be auto-created)
   */
  private innerElem: any;

  /**
   * Anchor tag wrapping the `ellipsisCharacters`
   */
  private moreAnchor: HTMLAnchorElement;

  /**
   * Remove function for the currently registered click listener
   * on the link `this.ellipsisCharacters` are wrapped in.
   */
  private destroyMoreClickListener: () => void;

  /**
   * Remove the window listener registered by a previous call to `addWindowResizeListener()`.
   */
  private removeWindowResizeListener: () => void;

  /**
   * The ellipsis html attribute
   * If anything is passed, this will be used as a string to append to
   * the truncated contents.
   * Else '...' will be appended.
   */
  @Input('ellipsis') ellipsisCharacters: string;

  /**
   * The ellipsisContent html attribute
   * If passed this is used as content, else contents
   * are fetched from textContent
   */
  @Input('ellipsisContent') ellipsisContent: string | number = null;

  /**
   * The ellipsisWordBoundaries html attribute
   * If anything is passed, each character will be interpreted
   * as a word boundary at which the text may be truncated.
   * Else the text may be truncated at any character.
   */
  @Input('ellipsisWordBoundaries') ellipsisWordBoundaries: string;

  /**
   * Function to use for string splitting. Defaults to the native `String#substr`.
   * (This may for example be used to avoid splitting surrogate pairs- used by some emojis -
   * by providing a lib such as runes.)
   */
  @Input('ellipsisSubstrFn') ellipsisSubstrFn:  (str: string, from: number, length?: number) => string;

  /**
   * The ellipsisResizeDetection html attribute
   * Algorithm to use to detect element/window resize - any of the following:
   * 'element-resize-detector': (default) Use https://github.com/wnr/element-resize-detector with its 'scroll' strategy
   * 'element-resize-detector-object': Use https://github.com/wnr/element-resize-detector with its 'object' strategy (deprecated)
   * 'window': Only check if the whole window has been resized/changed orientation by using angular's built-in HostListener
   */
  @Input('ellipsisResizeDetection') resizeDetectionStrategy:
    '' | 'manual' | 'element-resize-detector' | 'element-resize-detector-object' | 'window';

  /**
   * The ellipsisClickMore html attribute
   * If anything is passed, the ellipsisCharacters will be
   * wrapped in <a></a> tags and an event handler for the
   * passed function will be added to the link
   */
  @Output('ellipsisClickMore') moreClickEmitter: EventEmitter<MouseEvent> = new EventEmitter();


  /**
   * The ellipsisChange html attribute
   * This emits after which index the text has been truncated.
   * If it hasn't been truncated, null is emitted.
   */
  @Output('ellipsisChange') changeEmitter: EventEmitter<number> = new EventEmitter();

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

  private flattenNodes(element: Node): Node[] {
    const nodes: Node[] = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes.item(i);
      nodes.push(child, ...this.flattenNodes(child));
    }

    return nodes;
  }

  /**
   * Convert ellipsis input to string
   * @param input string or number to be displayed as an ellipsis
   * @return      input converted to string
   */
  private convertEllipsisInputToHTMLElement(input: string | number): HTMLElement {
    const div = this.renderer.createElement('div');
    if (typeof input === 'undefined' || input === null) {
      return div;
    }

    div.innerHTML = String(input);

    return div;
  }

  /**
   * The directive's constructor
   */
  public constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * Angular's init view life cycle hook.
   * Initializes the element for displaying the ellipsis.
   */
  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      // in angular universal we don't have access to the ugly
      // DOM manipulation properties we sadly need to access here,
      // so wait until we're in the browser:
      return;
    }

    // let the ellipsis characters default to '...':
    if (this.ellipsisCharacters === '') {
      this.ellipsisCharacters = '...';
    }

    // create more anchor element:
    this.moreAnchor = <HTMLAnchorElement> this.renderer.createElement('a');
    this.moreAnchor.className = 'ngx-ellipsis-more';
    this.moreAnchor.href = '#';
    this.moreAnchor.textContent = this.ellipsisCharacters;

    // perform regex replace on word boundaries:
    if (!this.ellipsisWordBoundaries) {
      this.ellipsisWordBoundaries = '';
    }
    this.ellipsisWordBoundaries = '[' + this.ellipsisWordBoundaries.replace(/\\n/, '\n').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ']';

    if (!this.ellipsisSubstrFn) {
      this.ellipsisSubstrFn = (str: string, from: number, length?: number) => {
        return str.substr(from, length);
      }
    }

    // store the original contents of the element:
    this.elem = this.elementRef.nativeElement;
    if (typeof this.ellipsisContent !== 'undefined' && this.ellipsisContent !== null) {
      this.originalContent = this.convertEllipsisInputToHTMLElement(this.ellipsisContent);
    } else if (!this.originalContent) {
      // TODO: Make this depend on the new input
      this.originalContent = this.convertEllipsisInputToHTMLElement(this.elem.innerHTML);
    }

    // add a wrapper div (required for resize events to work properly):
    this.renderer.setProperty(this.elem, 'innerHTML', '');
    this.innerElem = this.originalContent.cloneNode(true);
    this.renderer.addClass(this.innerElem, 'ngx-ellipsis-inner');
    this.renderer.appendChild(this.elem, this.innerElem);

    // start listening for resize events:
    this.addResizeListener(true);
  }

  /**
   * Angular's change life cycle hook.
   * Change original text (if the ellipsisContent has been passed)
   * and re-render
   */
  ngOnChanges() {
    // TODO:
    // if (!this.elem
    //   || typeof this.ellipsisContent === 'undefined'
    //   || this.originalNodes === this.convertEllipsisInputToString(this.ellipsisContent)) {
    //   return;
    // }

    // this.originalNodes = this.convertEllipsisInputToString(this.ellipsisContent);
    // this.applyEllipsis();
  }

  /**
   * Angular's destroy life cycle hook.
   * Remove event listeners
   */
  ngOnDestroy() {
    // In angular universal we don't have any listeners hooked up (all requiring ugly DOM manipulation methods),
    // so we only need to remove them, if we're inside the browser:
    if (isPlatformBrowser(this.platformId)) {
      this.removeAllListeners();
    }
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
        this.addWindowResizeListener();
        break;
      case 'element-resize-detector-object':
        this.addElementResizeListener(false);
        break;
      default:
        if (typeof (console) !== 'undefined') {
          console.warn(
            `No such ellipsisResizeDetection strategy: '${this.resizeDetectionStrategy}'. Using 'element-resize-detector' instead`
          );
        }
      // eslint-disable-next-line no-fallthrough
      case 'element-resize-detector':
      case '':
        this.addElementResizeListener();
        break;
    }

    if (triggerNow && this.resizeDetectionStrategy !== 'manual') {
      this.applyEllipsis();
    }
  }

  /**
   * Set up an event listener to call applyEllipsis() whenever the window gets resized.
   */
  private addWindowResizeListener() {
    this.removeWindowResizeListener = this.renderer.listen('window', 'resize', () => {
      this.ngZone.run(() => {
        this.applyEllipsis();
      });
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
      this.removeWindowResizeListener();
    }
  }

  /**
   * Get the original text's truncated version. If the text really needed to
   * be truncated, this.ellipsisCharacters will be appended.
   * @param max the maximum length the text may have
   * @return string       the truncated string
   */
  private getTruncatedContents(max: number): HTMLElement {
    const currentContent = <HTMLElement> this.originalContent.cloneNode(true);
    if (!this.originalContent || this.originalContent.textContent.length <= max) {
      return currentContent;
    }

    const nodes = <CharacterData[]> this.flattenNodes(currentContent)
      .filter(node => node.nodeType === Node.TEXT_NODE);

    let foundIndex = -1;
    let offset = 0;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      offset += node.data.length;
      if (offset >= max) {
        foundIndex = i;
        break;
      }
    }

    const foundNode = nodes[foundIndex];
    foundNode.data = this.ellipsisSubstrFn(foundNode.data, 0, max - offset + foundNode.data.length);
    for (let i = foundIndex + 1; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.data !== '' && node.parentElement !== currentContent && node.parentElement.childNodes.length === 1) {
        node.parentElement.remove();
      } else {
        node.data = '';
      }
    }

    return currentContent;

    // const truncatedText = this.ellipsisSubstrFn(this.originalContent, 0, max);
    // if (this.ellipsisWordBoundaries === '[]' || this.originalContent.charAt(max).match(this.ellipsisWordBoundaries)) {
    //   return truncatedText;
    // }

    // let i = max - 1;
    // while (i > 0 && !truncatedText.charAt(i).match(this.ellipsisWordBoundaries)) {
    //   i--;
    // }
    // return this.ellipsisSubstrFn(truncatedText, 0, i);
  }

  /**
   * Set the truncated text to be displayed in the inner div
   * @param max the maximum length the text may have
   * @param addMoreListener=false listen for click on the ellipsisCharacters anchor tag if the text has been truncated
   * @returns length of remaining text (excluding the ellipsisCharacters, if they were added)
   */
  private truncateText(max: number, addMoreListener = false): number {
    let truncatedContents = this.getTruncatedContents(max);
    const truncatedLength = truncatedContents.textContent.length;
    const textTruncated = (truncatedLength !== this.originalContent.textContent.length);

    if (textTruncated && !this.showMoreLink) {
      truncatedContents.appendChild(this.renderer.createText(this.ellipsisCharacters));
    }

    this.renderer.setProperty(this.innerElem, 'innerHTML', truncatedContents.innerHTML);

    if (textTruncated && this.showMoreLink) {
      this.renderer.appendChild(this.innerElem, this.moreAnchor);
    }

    // Remove any existing more click listener:
    if (this.destroyMoreClickListener) {
      this.destroyMoreClickListener();
      this.destroyMoreClickListener = null;
    }

    // If the text has been truncated, add a more click listener:
    if (addMoreListener && textTruncated) {
      this.destroyMoreClickListener = this.renderer.listen(this.moreAnchor, 'click', (e: MouseEvent) => {
        if (!e.target || (<HTMLElement> e.target).className !== 'ngx-ellipsis-more') {
          return;
        }
        e.preventDefault();
        this.moreClickEmitter.emit(e);
      });
    }

    return truncatedLength;
  }

  /**
   * Display ellipsis in the inner div if the text would exceed the boundaries
   */
  public applyEllipsis() {
    // Remove the resize listener as changing the contained text would trigger events:
    this.removeResizeListener();

    // Find the best length by trial and error:
    const maxLength = EllipsisDirective.numericBinarySearch(this.originalContent.textContent.length, curLength => {
      this.truncateText(curLength);
      return !this.isOverflowing;
    });

    // Apply the best length:
    const finalLength = this.truncateText(maxLength, this.showMoreLink);
    console.log(this.innerElem.innerHTML, finalLength);

    // Re-attach the resize listener:
    this.addResizeListener();

    // Emit change event:
    if (this.changeEmitter.observers.length > 0) {
      this.changeEmitter.emit(
        (this.originalContent.textContent.length === finalLength) ? null : finalLength
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

  /**
   * Whether the `ellipsisCharacters` are to be wrapped inside an anchor tag (if they are shown at all)
   */
  private get showMoreLink(): boolean {
    return (this.moreClickEmitter.observers.length > 0);
  }
}
