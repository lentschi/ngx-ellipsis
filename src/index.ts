import { NgModule } from '@angular/core';

import { EllipsisDirective } from './lib/directives/ellipsis.directive';

@NgModule({
  declarations: [
    EllipsisDirective,
  ],
  exports: [EllipsisDirective]
})
export class EllipsisModule {}