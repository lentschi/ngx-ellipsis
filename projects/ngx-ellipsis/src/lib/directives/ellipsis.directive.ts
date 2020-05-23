import {
  Directive,
  Renderer2,
  Input,
  Output,
  EventEmitter,
  NgZone,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  ComponentFactoryResolver,
  ComponentFactory,
  EmbeddedViewRef,
  AfterViewChecked,
  OnInit
} from '@angular/core';
import elementResizeDetectorMaker from 'element-resize-detector';
import { isPlatformBrowser } from '@angular/common';
import { EllipsisContentComponent } from '../components/ellipsis-content.component';

/**
 * Directive to truncate the contained text, if it exceeds the element's boundaries
 * and append characters (configurable, default '...') if so.
 */
@Directive({
  selector: '[ellipsis]',
  exportAs: 'ellipsis'
})
export class EllipsisDirective implements OnInit, OnDestroy, AfterViewChecked {
  /**
   * Instance of https://github.com/wnr/element-resize-detector
   */
  private static elementResizeDetector: elementResizeDetectorMaker.Erd = null;


  /**
   * The referenced element
   */
  private elem: HTMLElement;


  /**
   * Remove the window listener registered by a previous call to `addWindowResizeListener()`.
   */
  private removeWindowResizeListener: () => void;

  private compFactory: ComponentFactory<EllipsisContentComponent>;
  private initialTextLength: number;
  private templateView: EmbeddedViewRef<unknown>;

  /**
   * The ellipsis html attribute
   * If anything is passed, this will be used as a string to append to
   * the truncated contents.
   * Else '...' will be appended.
   */
  @Input() ellipsis = true;

  @Input() ellipsisIndicator: string | TemplateRef<unknown> = '...';

  /**
   * The ellipsisWordBoundaries html attribute
   * If anything is passed, each character will be interpreted
   * as a word boundary at which the text may be truncated.
   * Else the text may be truncated at any character.
   */
  @Input() ellipsisWordBoundaries: string;

  /**
   * Function to use for string splitting. Defaults to the native `String#substr`.
   * (This may for example be used to avoid splitting surrogate pairs- used by some emojis -
   * by providing a lib such as runes.)
   */
  @Input() ellipsisSubstrFn: (str: string, from: number, length?: number) => string;

  /**
   * The ellipsisResizeDetection html attribute
   * Algorithm to use to detect element/window resize - any of the following:
   * 'element-resize-detector': (default) Use https://github.com/wnr/element-resize-detector with its 'scroll' strategy
   * 'element-resize-detector-object': Use https://github.com/wnr/element-resize-detector with its 'object' strategy (deprecated)
   * 'window': Only check if the whole window has been resized/changed orientation by using angular's built-in HostListener
   */
  @Input() ellipsisResizeDetection:
    '' | 'manual' | 'element-resize-detector' | 'element-resize-detector-object' | 'window';


  /**
   * The ellipsisChange html attribute
   * This emits after which index the text has been truncated.
   * If it hasn't been truncated, null is emitted.
   */
  @Output() ellipsisChange: EventEmitter<number> = new EventEmitter();
  private indicatorView: EmbeddedViewRef<unknown>;
  private previousTemplateHtml: string;

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
      mid = Math.floor((low + high) / 2);
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

  private flattenTextAndElementNodes(element: HTMLElement): (CharacterData | HTMLElement)[] {
    const nodes: (CharacterData | HTMLElement)[] = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes.item(i);
      if (child instanceof HTMLElement || child instanceof CharacterData) {
        nodes.push(child);

        if (child instanceof HTMLElement) {
          nodes.push(...this.flattenTextAndElementNodes(child));
        }
      }
    }

    return nodes;
  }


  /**
   * The directive's constructor
   */
  public constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private resolver: ComponentFactoryResolver,
    private renderer: Renderer2,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * Angular's init view life cycle hook.
   * Initializes the element for displaying the ellipsis.
   */
  ngOnInit() {
    this.compFactory = this.resolver.resolveComponentFactory(EllipsisContentComponent);
    this.updateView();

    if (!isPlatformBrowser(this.platformId)) {
      // in angular universal we don't have access to the ugly
      // DOM manipulation properties we sadly need to access here,
      // so wait until we're in the browser:
      return;
    }

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

    // start listening for resize events:
    this.addResizeListener(true);
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

  ngAfterViewChecked() {
    if (this.ellipsisResizeDetection !== 'manual') {
      if (this.templatesHaveChanged) {
        console.log('applying after view check');
        this.applyEllipsis();
      }
    }
  }

  private nodesToHtml(nodes: Node[]): string {
    const div = <HTMLElement> this.renderer.createElement('div');
    div.append(...nodes.map(node => node.cloneNode(true)));
    return div.innerHTML;
  }

  private templatesToHtml(templateView: EmbeddedViewRef<unknown>, indicatorView?: EmbeddedViewRef<unknown>): string {
    let html = this.nodesToHtml(templateView.rootNodes);
    if (indicatorView) {
      html += this.nodesToHtml(indicatorView.rootNodes);
    } else {
      html += <string> this.ellipsisIndicator;
    }

    return html;
  }

  private get templatesHaveChanged(): boolean {
    if (!this.templateView || !this.previousTemplateHtml) {
      return false;
    }

    const templateView = this.templateRef.createEmbeddedView({});
    templateView.detectChanges();

    const indicatorView = (typeof this.ellipsisIndicator !== 'string') ? this.ellipsisIndicator.createEmbeddedView({}) : null;
    if (indicatorView) {
      indicatorView.detectChanges();
    }

    const templateHtml = this.templatesToHtml(templateView, indicatorView);

    return this.previousTemplateHtml !== templateHtml;
  }

  private updateView() {
    this.viewContainer.clear();
    this.templateView = this.templateRef.createEmbeddedView({});
    this.templateView.detectChanges();
    const componentRef = this.viewContainer.createComponent(
      this.compFactory, null, this.viewContainer.injector, [this.templateView.rootNodes]
    );
    this.elem = componentRef.instance.elementRef.nativeElement;
    this.initialTextLength = this.elem.textContent.trim().length;

    this.indicatorView = (typeof this.ellipsisIndicator !== 'string') ? this.ellipsisIndicator.createEmbeddedView({}) : null;
    if (this.indicatorView) {
      this.indicatorView.detectChanges();
    }
  }

  /**
   * remove all resize listeners
   */
  private removeAllListeners() {
    this.removeResizeListener();
  }


  /**
   * Set up an event listener to call applyEllipsis() whenever a resize has been registered.
   * The type of the listener (window/element) depends on the resizeDetectionStrategy.
   * @param triggerNow=false if true, the ellipsis is applied immediately
   */
  private addResizeListener(triggerNow = false) {
    if (typeof (this.ellipsisResizeDetection) === 'undefined') {
      this.ellipsisResizeDetection = '';
    }

    switch (this.ellipsisResizeDetection) {
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
            `No such ellipsisResizeDetection strategy: '${this.ellipsisResizeDetection}'. Using 'element-resize-detector' instead`
          );
        }
      // eslint-disable-next-line no-fallthrough
      case 'element-resize-detector':
      case '':
        this.addElementResizeListener();
        break;
    }

    if (triggerNow && this.ellipsisResizeDetection !== 'manual') {
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

    let eventCount = 0;
    EllipsisDirective.elementResizeDetector.listenTo(this.elem, () => {
      if (eventCount < 2) {
        // elementResizeDetector fires the event directly after re-attaching the listener
        // -> discard that first event:
        eventCount++;
        return;
      }
      this.applyEllipsis();
    });
  }

  /**
   * Stop listening for any resize event.
   */
  private removeResizeListener() {
    if (this.ellipsisResizeDetection !== 'window') {
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
   * @returns the text node that has been truncated or null if truncating wasn't required
   */
  private truncateContents(max: number): CharacterData {
    this.updateView();
    const nodes = <(HTMLElement | CharacterData)[]>this.flattenTextAndElementNodes(this.elem)
      .filter(node => [Node.TEXT_NODE, Node.ELEMENT_NODE].includes(node.nodeType));

    let foundIndex = -1;
    let foundNode: CharacterData;
    let offset = this.initialTextLength;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];

      if (!(node instanceof CharacterData)) {
        continue;
      }

      offset -= node.data.length;
      if (offset < max || (offset === 0 && max === 0)) {
        if (this.ellipsisWordBoundaries === '[]') {
          node.data = this.ellipsisSubstrFn(node.data, 0, max - offset);
        } else if (max - offset !== node.data.length) {
          let j = max - offset - 1;
          while (j > 0 && !node.data.charAt(j).match(this.ellipsisWordBoundaries)) {
            j--;
          }
          node.data = this.ellipsisSubstrFn(node.data, 0, j);
        }
        foundIndex = i;
        foundNode = node;
        break;
      }
    }

    for (let i = foundIndex + 1; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.textContent !== '' && node.parentElement !== this.elem && node.parentElement.childNodes.length === 1) {
        node.parentElement.remove();
      } else {
        node.remove();
      }
    }

    return (this.elem.textContent.trim().length !== this.initialTextLength) ? foundNode : null;
  }

  /**
   * Set the truncated text to be displayed in the inner div
   * @param max the maximum length the text may have
   * @param addMoreListener=false listen for click on the ellipsisCharacters anchor tag if the text has been truncated
   */
  private truncateText(max: number) {
    const truncatedNode = this.truncateContents(max);

    if (truncatedNode) {
      if (!this.indicatorView) {
        truncatedNode.data += <string> this.ellipsisIndicator;
      } else {
        // Remove last truncated node, if empty:
        if (
          truncatedNode.textContent === ''
          && truncatedNode.parentElement !== this.elem
          && truncatedNode.parentElement.childNodes.length === 1
        ) {
          truncatedNode.parentElement.remove();
        }

        for (const node of this.indicatorView.rootNodes) {
          this.renderer.appendChild(this.elem, node);
        }
      }
    }
  }


  /**
   * Display ellipsis in the inner div if the text would exceed the boundaries
   */
  public applyEllipsis() {
    // Remove the resize listener as changing the contained text would trigger events:
    this.removeResizeListener();

    // update from templates:
    this.updateView();

    // remember template state:
    this.previousTemplateHtml = this.templatesToHtml(this.templateView, this.indicatorView);

    // abort if [ellipsis]="false" has been set
    if (!this.ellipsis) {
      return;
    }

    // Find the best length by trial and error:
    const maxLength = EllipsisDirective.numericBinarySearch(this.initialTextLength, curLength => {
      this.truncateText(curLength);
      return !this.isOverflowing;
    });

    // Apply the best length:
    this.truncateText(maxLength);

    // Re-attach the resize listener:
    this.addResizeListener();

    // Emit change event:
    if (this.ellipsisChange.observers.length > 0) {
      this.ellipsisChange.emit(
        (this.elem.textContent.trim().length === this.initialTextLength) ? null : this.elem.textContent.trim().length
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
