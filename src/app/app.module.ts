import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { EllipsisDirective } from '../lib/directives/ellipsis.directive';

@NgModule({
  declarations: [
    AppComponent,
    EllipsisDirective
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
