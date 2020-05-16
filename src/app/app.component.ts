import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ngx-ellipsis-demo';
  longText = '<b>Hui<i>Test<em>Lala</em>Lalu</i></b>';
  number = 12.4564564564564564;

  showEllipsis = true;
}
