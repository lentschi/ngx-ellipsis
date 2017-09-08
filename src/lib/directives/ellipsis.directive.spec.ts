import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {Component} from '@angular/core';
import {EllipsisDirective} from './ellipsis.directive';
import { ComponentFixtureAutoDetect } from '@angular/core/testing';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe('EllipsisDirective', () => {
  let fixture:ComponentFixture<TestComponent>;
  let componentInstance:TestComponent;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        TestComponent,
        EllipsisDirective
      ],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true }
      ]
    });

    fixture = TestBed.createComponent(TestComponent);
    componentInstance = fixture.componentInstance;

    spyOn(componentInstance, 'ngAfterViewChecked');
  }));

  it('should create a ellipsis', async(() => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      const compiled = fixture.debugElement.nativeElement;
      const ellipsisDiv = compiled.querySelector('#ellipsisTest > div');
      expect(ellipsisDiv.innerHTML).toBe('Lorem ipsum dolor sit amet...');
    });

  }));
});

@Component({
  selector: 'ellipsis-test-cmp',
  template: `
    <div style="width: 100px; height:50px;" id="ellipsisTest" ellipsis>
      Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt
    </div>
  `
})
class TestComponent {
  ngAfterViewChecked() {

  }
}
