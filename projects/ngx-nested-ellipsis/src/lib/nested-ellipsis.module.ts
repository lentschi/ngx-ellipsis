import { NgModule } from '@angular/core';
import { NestedEllipsisDirective } from './directives/nested-ellipsis.directive';
import { NestedEllipsisContentComponent } from './components/nested-ellipsis-content.component';

@NgModule({
  imports: [
  ],
  declarations: [NestedEllipsisDirective, NestedEllipsisContentComponent],
  entryComponents: [NestedEllipsisContentComponent],
  exports: [NestedEllipsisDirective]
})
export class NestedEllipsisModule { }
