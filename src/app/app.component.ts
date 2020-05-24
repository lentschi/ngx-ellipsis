import { Component } from '@angular/core';
import runes from 'runes';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  longText = '<em>Lorem ipsum</em> dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt \
              ut labore et dolore magna \
              aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea\
              takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy \
              eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo \
              dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.';
  number = 12.4564564564564564;

  showEllipsis = true;

  mayTruncateAtFn = (node: CharacterData, position: number): boolean => {
    const runesArr = runes(node.data);
    let curPos = 0;
    for (const rune of runesArr) {
      curPos += rune.length;
      if (position === curPos) {
        return true;
      } else if (curPos > position) {
        return false;
      }
    }

    return true;
  }
}
