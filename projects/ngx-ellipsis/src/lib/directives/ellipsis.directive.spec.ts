import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import {Component, AfterViewChecked} from '@angular/core';
import {EllipsisDirective} from './ellipsis.directive';
import { ComponentFixtureAutoDetect } from '@angular/core/testing';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe('EllipsisDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let componentInstance: TestComponent;

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

  it('should create a ellipsis', async(async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;
    const ellipsisDiv = compiled.querySelector('#ellipsisTest > div');
    expect(ellipsisDiv.innerHTML).toBe('Lorem ipsum dolor sit amet...');

  }));

  it('should create a ellipsis escaping html content', async(async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;
    const ellipsisDiv = compiled.querySelector('#ellipsisTestDynamic > div');
    expect(ellipsisDiv.innerText).toBe('<b>Lorem ipsum</b> dolor sit amet, consetetur sadipscing...');

    componentInstance.htmlContent = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ellipsisDiv.innerText).toBe('Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed...');

    componentInstance.htmlContent = `Lorem ipsum dolor <b>sit amet</b>,
      consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt`;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ellipsisDiv.innerText).toBe('Lorem ipsum dolor <b>sit amet</b>, consetetur sadipscing...');
  }));
});

@Component({
  selector: 'ellipsis-test-cmp',
  template: `
    <div style="width: 100px; height:50px;" id="ellipsisTest" ellipsis>
      Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt
    </div>
    <div
        style="width: 100px; height:100px;"
        id="ellipsisTestDynamic"
        ellipsis
        ellipsis-word-boundaries=" \n"
        [ellipsis-content]="htmlContent"></div>
  `
})
class TestComponent implements AfterViewChecked {
  htmlContent = '<b>Lorem ipsum</b> dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
  ngAfterViewChecked() {

  }
}
