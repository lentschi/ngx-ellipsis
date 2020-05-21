import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  active = false;
  title = 'ngx-ellipsis-demo';
  longText = 'Hallo Test';
  number = 12.4564564564564564;

  showEllipsis = true;
}
