import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  active = false;
  title = 'ngx-ellipsis-demo';
  longText = '<b>Hui<i>Test<em>Lala</em><br>Lalu</i></b>Bubu';
  number = 12.4564564564564564;

  showEllipsis = true;
}
