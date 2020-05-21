import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'ellipsis-content',
  template: `
    <ng-content></ng-content>
  `,
  styles: [`
    :host {
      display: inline-block; width: 100%;
    }
  `]
})
export class EllipsisContentComponent {
  constructor(public elementRef: ElementRef) {}
}
