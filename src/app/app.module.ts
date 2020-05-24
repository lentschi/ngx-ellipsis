import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { EllipsisModule } from '../../projects/ngx-ellipsis/src/public_api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Utf8EmojisToImagesModule } from 'ng-utf8-emojis-to-images';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    EllipsisModule,
    CommonModule,
    FormsModule,
    Utf8EmojisToImagesModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
