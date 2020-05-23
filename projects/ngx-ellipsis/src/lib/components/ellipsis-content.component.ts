import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'ellipsis-content',
  template: `
    <ng-content></ng-content>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class EllipsisContentComponent {
  constructor(public elementRef: ElementRef) {}
}

