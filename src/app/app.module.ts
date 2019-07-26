import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { EllipsisModule } from '../../projects/ngx-ellipsis/src/public_api';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    EllipsisModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
