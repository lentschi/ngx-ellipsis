import { TestBed, async } from '@angular/core/testing';
import { Component } from '@angular/core';
import { NestedEllipsisDirective } from './nested-ellipsis.directive';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

const ELLIPSIS_TEST_CSS = `
  * {
    font-family: 'Times New Roman', Times, serif;
    font-size: 16px;
    letter-spacing: 0.01px;
    word-spacing: 0.01px;
  }
`;


@Component({
  selector: 'ellipsis-test-cmp',
  template: `
    <div style="width: 100px; height:50px;" id="ellipsisTest">
      <ng-template nestedEllipsis>
        Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt
      </ng-template>
    </div>
  `,
  styles: [ ELLIPSIS_TEST_CSS ]
})
class StaticTestComponent {
}

@Component({
  selector: 'ellipsis-test-cmp',
  template: `
    <div [ngStyle]="styles"
        id="ellipsisTestDynamic">
      <ng-template nestedEllipsis
        [nestedEllipsisWordBoundaries]="wordBoundaries"
        (nestedEllipsisChange)="onEllipsisChange($event)">{{htmlContent}}</ng-template>
    </div>
  `,
  styles: [ ELLIPSIS_TEST_CSS ]
})
class DynamicTestComponent {
  htmlContent = '<b>Lorem ipsum</b> dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
  wordBoundaries = ' \n';
  styles = {
    width: '100px',
    height: '100px'
  };

  onEllipsisChange(_truncatedAt: number) { }
}

@Component({
  selector: 'ellipsis-number-test-cmp',
  template: `
    <div
        style="width: 100px; height:100px;"
        id="ellipsisNumberTestDynamic">
      <ng-template nestedEllipsis>{{htmlContent}}</ng-template>
    </div>
  `,
  styles: [ ELLIPSIS_TEST_CSS ]
})
class NumberTestComponent {
  htmlContent = 0;
}

describe('NestedEllipsisDirective', () => {

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        DynamicTestComponent,
        NumberTestComponent,
        StaticTestComponent,
        NestedEllipsisDirective
      ],
      providers: [
      ]
    });
  }));

  it('should create a ellipsis', async(async () => {
    const fixture = TestBed.createComponent(StaticTestComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;
    const ellipsisDiv = compiled.querySelector('#ellipsisTest > nested-ellipsis-content');
    expect(ellipsisDiv.innerHTML.trim()).toBe('Lorem ipsum dolor sit ame...');
  }));

  it('should emit details about the ellipsis', async(async () => {
    const fixture = TestBed.createComponent(DynamicTestComponent);
    const componentInstance = fixture.componentInstance;
    const changeSpy = spyOn(componentInstance, 'onEllipsisChange');

    fixture.detectChanges();
    await fixture.whenStable();
    componentInstance.htmlContent = 'Test';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changeSpy.calls.count()).toBe(2);
    expect(changeSpy.calls.mostRecent().args.length).toBe(1);
    expect(changeSpy.calls.mostRecent().args[0]).toEqual(null);

    const newTestText = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
    componentInstance.htmlContent = newTestText;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changeSpy.calls.count()).toBe(3);
    expect(changeSpy.calls.mostRecent().args.length).toBe(1);
    expect(changeSpy.calls.mostRecent().args[0]).toEqual(63);
  }));

  it('should create a ellipsis escaping html content', async(async () => {
    const fixture = TestBed.createComponent(DynamicTestComponent);
    const componentInstance = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;
    let ellipsisDiv = compiled.querySelector('#ellipsisTestDynamic > nested-ellipsis-content');
    expect(ellipsisDiv.innerText).toBe('<b>Lorem ipsum</b> dolor sit amet, consetetur sadipscing...');

    componentInstance.htmlContent = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
    fixture.detectChanges();
    await fixture.whenStable();
    ellipsisDiv = compiled.querySelector('#ellipsisTestDynamic > nested-ellipsis-content');
    expect(ellipsisDiv.innerText).toBe('Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed...');

    componentInstance.htmlContent = `Lorem ipsum dolor <b>sit amet</b>,
      consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt`;
    fixture.detectChanges();
    await fixture.whenStable();
    ellipsisDiv = compiled.querySelector('#ellipsisTestDynamic > nested-ellipsis-content');
    expect(ellipsisDiv.innerText).toBe('Lorem ipsum dolor <b>sit amet</b>, consetetur sadipscing...');

    // Check that special characters aren't falsely separated
    // (see https://github.com/lentschi/ngx-nested-ellipsis/issues/29):
    componentInstance.htmlContent = 'C\'est l\'homme&nbsp;qui a vu <b>l\'homme</b> qui a vu l\'ours.';
    componentInstance.wordBoundaries = '';
    componentInstance.styles.width = '390px';
    componentInstance.styles.height = '30px';
    fixture.detectChanges();
    await fixture.whenStable();
    ellipsisDiv = compiled.querySelector('#ellipsisTestDynamic > nested-ellipsis-content');
    expect(ellipsisDiv.innerText).toBe('C\'est l\'homme&nbsp;qui a vu <b>l\'homme</b> qui a vu l\'...');
  }));

  it('should handle null graciously', async(async () => {
    const fixture = TestBed.createComponent(DynamicTestComponent);
    const componentInstance = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;
    let ellipsisDiv = compiled.querySelector('#ellipsisTestDynamic > nested-ellipsis-content');
    expect(ellipsisDiv.innerText).toBe('<b>Lorem ipsum</b> dolor sit amet, consetetur sadipscing...');

    componentInstance.htmlContent = null;
    fixture.detectChanges();
    await fixture.whenStable();
    ellipsisDiv = compiled.querySelector('#ellipsisTestDynamic > nested-ellipsis-content');
    expect(ellipsisDiv.innerText).toBe('');
  }));

  it('should handle numbers graciously', async(async () => {
    const numberFixture = TestBed.createComponent(NumberTestComponent);
    const numberComponentInstance = numberFixture.componentInstance;

    numberFixture.detectChanges();
    await numberFixture.whenStable();

    const compiled = numberFixture.debugElement.nativeElement;
    let ellipsisDiv = compiled.querySelector('#ellipsisNumberTestDynamic > nested-ellipsis-content');
    numberFixture.detectChanges();
    await numberFixture.whenStable();

    // check if zero works upon initialization - without ngOnChanges
    // (s. https://github.com/lentschi/ngx-nested-ellipsis/issues/26):
    expect(ellipsisDiv.innerText).toBe('0');

    numberComponentInstance.htmlContent = Math.PI;
    numberFixture.detectChanges();
    await numberFixture.whenStable();
    ellipsisDiv = compiled.querySelector('#ellipsisNumberTestDynamic > nested-ellipsis-content');
    expect(ellipsisDiv.innerText).toBe('3.141592653...');
  }));
});


