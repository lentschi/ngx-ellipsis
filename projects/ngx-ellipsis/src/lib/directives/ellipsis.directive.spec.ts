import { TestBed, async } from '@angular/core/testing';
import { Component } from '@angular/core';
import { EllipsisDirective } from './ellipsis.directive';
import { ComponentFixtureAutoDetect } from '@angular/core/testing';

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
    <div style="width: 100px; height:50px;" id="ellipsisTest" ellipsis>
      Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt
    </div>
  `,
    styles: [ELLIPSIS_TEST_CSS],
    standalone: true
})
class StaticTestComponent {
}

@Component({
    selector: 'ellipsis-test-cmp',
    template: `
    <div
        id="ellipsisTestDynamic"
        [ellipsis]="ellipsisMoreText"
        [ngStyle]="styles"
        [ellipsis-word-boundaries]="wordBoundaries"
        [ellipsis-content]="htmlContent"
        (ellipsis-change)="onEllipsisChange($event)"
        (ellipsis-click-more)="onEllipsisClickMore($event)"></div>
  `,
    styles: [ELLIPSIS_TEST_CSS],
    standalone: true
})
class DynamicTestComponent {
  htmlContent = '<b>Lorem ipsum</b> dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
  wordBoundaries = ' \n';
  styles = {
    width: '100px',
    height: '100px'
  };
  ellipsisMoreText = '...';

  onEllipsisChange(_truncatedAt: number) { }

  onEllipsisClickMore(_event: MouseEvent) { }
}

@Component({
    selector: 'ellipsis-number-test-cmp',
    template: `
    <div
        style="width: 100px; height:100px;"
        id="ellipsisNumberTestDynamic"
        ellipsis
        [ellipsis-content]="htmlContent"></div>
  `,
    styles: [ELLIPSIS_TEST_CSS],
    standalone: true
})
class NumberTestComponent {
  htmlContent = 0;
}

describe('EllipsisDirective', () => {

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    imports: [DynamicTestComponent,
        NumberTestComponent,
        StaticTestComponent,
        EllipsisDirective],
    providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true }
    ]
});
  }));

  it('should create a ellipsis', async(async () => {
    const fixture = TestBed.createComponent(StaticTestComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;
    const ellipsisDiv = compiled.querySelector('#ellipsisTest > div');
    expect(ellipsisDiv.innerHTML).toBe('Lorem ipsum dolor sit ame...');
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
    expect(changeSpy.calls.count()).toBe(1);
    expect(changeSpy.calls.mostRecent().args.length).toBe(1);
    expect(changeSpy.calls.mostRecent().args[0]).toEqual(null);

    const newTestText = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
    componentInstance.htmlContent = newTestText;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changeSpy.calls.count()).toBe(2);
    expect(changeSpy.calls.mostRecent().args.length).toBe(1);
    expect(changeSpy.calls.mostRecent().args[0]).toEqual(60);
  }));

  it('should display click more', async(async () => {
    const fixture = TestBed.createComponent(DynamicTestComponent);
    const componentInstance = fixture.componentInstance;
    const clickMoreSpy = spyOn(componentInstance, 'onEllipsisClickMore');
    componentInstance.htmlContent = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;

    let moreSpan = <HTMLSpanElement> compiled.querySelector('#ellipsisTestDynamic .ngx-ellipsis-more');
    expect(moreSpan.innerText).toBe('...');
    moreSpan.click();
    expect(clickMoreSpy.calls.count()).toBe(1);
  }));

  // s. https://github.com/lentschi/ngx-ellipsis/issues/44:
  it('should adapt more link text on input change', async(async () => {
    const fixture = TestBed.createComponent(DynamicTestComponent);
    const componentInstance = fixture.componentInstance;
    componentInstance.htmlContent = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt';
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;

    let moreSpan = <HTMLSpanElement> compiled.querySelector('#ellipsisTestDynamic .ngx-ellipsis-more');
    expect(moreSpan.innerText).toBe('...');

    componentInstance.ellipsisMoreText = ' (more)';
    fixture.detectChanges();
    await fixture.whenStable();
    moreSpan = <HTMLSpanElement> compiled.querySelector('#ellipsisTestDynamic .ngx-ellipsis-more');
    expect(moreSpan.innerText).toBe(' (more)');
  }));

  it('should create a ellipsis escaping html content', async(async () => {
    const fixture = TestBed.createComponent(DynamicTestComponent);
    const componentInstance = fixture.componentInstance;

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

    // Check that special characters aren't falsely separated
    // (see https://github.com/lentschi/ngx-ellipsis/issues/29):
    componentInstance.htmlContent = 'C\'est l\'homme&nbsp;qui a vu <b>l\'homme</b> qui a vu l\'ours.';
    componentInstance.wordBoundaries = '';
    componentInstance.styles.width = '390px';
    componentInstance.styles.height = '30px';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ellipsisDiv.innerText).toBe('C\'est l\'homme&nbsp;qui a vu <b>l\'homme</b> qui a vu l\'...');
  }));

  it('should handle null graciously', async(async () => {
    const fixture = TestBed.createComponent(DynamicTestComponent);
    const componentInstance = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.debugElement.nativeElement;
    const ellipsisDiv = compiled.querySelector('#ellipsisTestDynamic > div');
    expect(ellipsisDiv.innerText).toBe('<b>Lorem ipsum</b> dolor sit amet, consetetur sadipscing...');

    componentInstance.htmlContent = null;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ellipsisDiv.innerText).toBe('');
  }));

  it('should handle numbers graciously', async(async () => {
    const numberFixture = TestBed.createComponent(NumberTestComponent);
    const numberComponentInstance = numberFixture.componentInstance;

    numberFixture.detectChanges();
    await numberFixture.whenStable();

    const compiled = numberFixture.debugElement.nativeElement;
    const ellipsisDiv = compiled.querySelector('#ellipsisNumberTestDynamic > div');
    numberFixture.detectChanges();
    await numberFixture.whenStable();

    // check if zero works upon initialization - without ngOnChanges
    // (s. https://github.com/lentschi/ngx-ellipsis/issues/26):
    expect(ellipsisDiv.innerText).toBe('0');

    numberComponentInstance.htmlContent = Math.PI;
    numberFixture.detectChanges();
    await numberFixture.whenStable();
    expect(ellipsisDiv.innerText).toBe('3.141592653...');
  }));
});


