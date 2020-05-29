import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  longText = '<em>Lorem ipsum</em> dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt \
              ut labore et dolore magna \
              aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea\
              takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy \
              eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo \
              dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.';
  number = this.randomNumber;
  private interval: ReturnType<typeof setInterval>;

  showEllipsis = true;

  ngOnInit() {
    this.interval = setInterval(() =>
      this.number = this.randomNumber,
    1000);
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  private get randomNumber(): number {
    return Math.random() * 1000;
  }
}
