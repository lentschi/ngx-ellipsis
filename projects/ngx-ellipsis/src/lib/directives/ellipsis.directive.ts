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
import ResizeObserver from 'resize-observer-polyfill';
import { isPlatformBrowser } from '@angular/common';
import { EllipsisContentComponent } from '../components/ellipsis-content.component';
import { EllipsisResizeDetectionEnum } from '../enums/ellipsis-resize-detection.enum';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';

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
   * The referenced element
   */
  private elem: HTMLElement;

  /**
   * Component factory required for rendering EllipsisContent component
   */
  private compFactory: ComponentFactory<EllipsisContentComponent>;

  /**
   * ViewRef of the main template (the one to be truncated)
   */
  private templateView: EmbeddedViewRef<unknown>;

  /**
   * ViewRef of the indicator template
   */
  private indicatorView: EmbeddedViewRef<unknown>;

  /**
   * Concatenated template html at the time of the last time the ellipsis has been applied
   */
  private previousTemplateHtml: string;

  /**
   * Text length before truncating
   */
  private initialTextLength: number;

  /**
   * Subject triggered when resize listeners should be removed
   */
  private removeResizeListeners$ = new Subject<void>();

  private previousDimensions: {
    width: number,
    height: number
  };

  /**
   * The ellipsis html attribute
   * Passing true (default) will perform the directive's task,
   * otherwise the template will be rendered without truncating its contents.
   */
  @Input() ellipsis: boolean;

  /**
   * The ellipsisIndicator html attribute
   * Passing a string (default: '...') will append it when the passed template has been truncated
   * Passing a template will append that template instead
   */
  @Input() ellipsisIndicator: string | TemplateRef<unknown>;

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
   * Algorithm to use to detect element/window resize - any value of `EllipsisResizeDetectionEnum`
   */
  @Input() ellipsisResizeDetection: EllipsisResizeDetectionEnum;


  /**
   * The ellipsisChange html attribute
   * This emits after which index the text has been truncated.
   * If it hasn't been truncated, null is emitted.
   */
  @Output() readonly ellipsisChange: EventEmitter<number> = new EventEmitter();

  /**
   * Utility method to quickly find the largest number for
   * which `callback(number)` still returns true.
   * @param  max      Highest possible number
   * @param  callback Should return true as long as the passed number is valid
   * @returns         Largest possible number
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
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly resolver: ComponentFactoryResolver,
    private readonly renderer: Renderer2,
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * Angular's onInit life cycle hook.
   * Initializes the element for displaying the ellipsis.
   */
  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      // in angular universal we don't have access to the ugly
      // DOM manipulation properties we sadly need to access here,
      // so wait until we're in the browser:
      return;
    }

    if (typeof(this.ellipsis) !== 'boolean') {
      this.ellipsis = true;
    }

    if (typeof(this.ellipsisIndicator) === 'undefined') {
      this.ellipsisIndicator = '...';
    }

    if (typeof (this.ellipsisResizeDetection) === 'undefined') {
      this.ellipsisResizeDetection = EllipsisResizeDetectionEnum.ResizeObserver;
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

    // initialize view:
    this.compFactory = this.resolver.resolveComponentFactory(EllipsisContentComponent);
    this.restoreView();
    this.previousDimensions = {
      width: this.elem.clientWidth,
      height: this.elem.clientHeight
    };

    this.applyEllipsis();
  }


  /**
   * Angular's destroy life cycle hook.
   * Remove event listeners
   */
  ngOnDestroy() {
    this.removeResizeListeners$.next();
    this.removeResizeListeners$.complete();
  }

  /**
   * Angular's afterViewChecked life cycle hook.
   * Reapply ellipsis, if any of the templates have changed
   */
  ngAfterViewChecked() {
    if (this.ellipsisResizeDetection !== 'manual') {
      if (this.templatesHaveChanged) {
        this.applyEllipsis();
      }
    }
  }

  /**
   * Convert a list of Nodes to html
   * @param nodes Nodes to convert
   * @returns html code
   */
  private nodesToHtml(nodes: Node[]): string {
    const div = <HTMLElement> this.renderer.createElement('div');
    div.append(...nodes.map(node => node.cloneNode(true)));
    return div.innerHTML;
  }

  /**
   * Convert the passed templates to html
   * @param templateView the main template view ref
   * @param indicatorView the indicator template view ref
   * @returns concatenated template html
   */
  private templatesToHtml(templateView: EmbeddedViewRef<unknown>, indicatorView?: EmbeddedViewRef<unknown>): string {
    let html = this.nodesToHtml(templateView.rootNodes);
    if (indicatorView) {
      html += this.nodesToHtml(indicatorView.rootNodes);
    } else {
      html += <string> this.ellipsisIndicator;
    }

    return html;
  }

  /**
   * Whether any of the passed templates have changed since the last time
   * the ellipsis has been applied
   */
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

  /**
   * Restore the view from the templates (non-truncated)
   */
  private restoreView() {
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
   * Set up an event listener to call applyEllipsis() whenever a resize has been registered.
   * The type of the listener (window/element) depends on the `ellipsisResizeDetection`.
   */
  private addResizeListener() {
    switch (this.ellipsisResizeDetection) {
      case EllipsisResizeDetectionEnum.Manual:
        // Users will trigger applyEllipsis via the public API
        break;
      case EllipsisResizeDetectionEnum.Window:
        this.addWindowResizeListener();
        break;
      default:
        if (typeof (console) !== 'undefined') {
          console.warn(`
            No such ellipsisResizeDetection strategy: '${this.ellipsisResizeDetection}'.
            Using '${EllipsisResizeDetectionEnum.ResizeObserver}' instead.
          `);
        }
        this.ellipsisResizeDetection = EllipsisResizeDetectionEnum.ResizeObserver;
      // eslint-disable-next-line no-fallthrough
      case EllipsisResizeDetectionEnum.ResizeObserver:
        this.addResizeObserver();
        break;
    }
  }

  /**
   * Set up an event listener to call applyEllipsis() whenever the window gets resized.
   */
  private addWindowResizeListener() {
    const removeWindowResizeListener = this.renderer.listen('window', 'resize', () => {
      this.ngZone.run(() => {
        this.applyEllipsis();
      });
    });

    this.removeResizeListeners$.pipe(take(1)).subscribe(() => removeWindowResizeListener());
  }

  /**
   * Set up an event listener to call applyEllipsis() whenever ResizeObserver is triggered for the element.
   */
  private addResizeObserver() {
    const resizeObserver = new ResizeObserver(() => {
      if (this.previousDimensions.width !== this.elem.clientWidth || this.previousDimensions.height !== this.elem.clientHeight) {
        this.ngZone.run(() => {
          this.applyEllipsis();
        });

        this.previousDimensions.width = this.elem.clientWidth;
        this.previousDimensions.height = this.elem.clientHeight;
      }
    });
    resizeObserver.observe(this.elem);
    this.removeResizeListeners$.pipe(take(1)).subscribe(() => resizeObserver.disconnect());
  }


  /**
   * Get the original text's truncated version. If the text really needed to
   * be truncated, this.ellipsisCharacters will be appended.
   * @param max the maximum length the text may have
   * @returns the text node that has been truncated or null if truncating wasn't required
   */
  private truncateContents(max: number): CharacterData {
    this.restoreView();
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
   * Display ellipsis in the EllipsisContentComponent if the text would exceed the boundaries
   */
  public applyEllipsis() {
    // Remove the resize listener as changing the contained text would trigger events:
    this.removeResizeListeners$.next();

    // update from templates:
    this.restoreView();

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
