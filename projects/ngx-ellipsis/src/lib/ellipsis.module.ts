import { NgModule } from '@angular/core';
import { EllipsisDirective } from './directives/ellipsis.directive';
import { EllipsisContentComponent } from './components/ellipsis-content.component';

@NgModule({
  imports: [
  ],
  declarations: [EllipsisDirective, EllipsisContentComponent],
  entryComponents: [EllipsisContentComponent],
  exports: [EllipsisDirective]
})
export class EllipsisModule { }
