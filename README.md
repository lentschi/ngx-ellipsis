# ngx-html-ellipsis

Library for angular (>= 6.0.0) providing a directive to display an ellipsis if the containing text would overflow.

Supports dynamic html contents - if you require text contents only you might want to take a look at [ngx-ellipsis](https://github.com/lentschi/ngx-ellipsis), which offers better performance but escapes any html contents to text.

## Demo

For a demo either just checkout this project and run `npm install && npm run start` or visit [the StackBlitz demo page](https://stackblitz.com/github/lentschi/ngx-html-ellipsis?file=src%2Fapp%2Fapp.component.html).

## Installation

For use in an existing angular project run `npm install ngx-ellipsis --save`.

Then add the installed module to your `app.module.ts`:

```typescript
import { EllipsisModule } from 'ngx-html-ellipsis';

// ...

@NgModule({
  // ...
  imports: [
    // ...
    EllipsisModule
  ]
  // ...
})
export class AppModule {}

```

## Usage

Anywhere in your template:

```html
<div style="width: 130px; height: 18px;">
  <ng-template [ellipsis]>Your very long <em>rich</em> text</ng-template>
</div>
```

As you can see, you need to define the dimensions of your element yourself. (ngx-ellipsis doesn't automatically add any element styles.) But of course you don't need to use fixed widths/heights like in these examples. Flex layout shold work just fine for example.

### Extra options

You may add the following attributes to change the directive's behavior:

| attribute | meaning |
| ---- | ---- |
| __ellipsis__ | _required_ Passing true (default) will perform the directive's task otherwise the template will be rendered without truncating its contents.|
| __ellipsisIndicator__ | Passing a string (default: '...') will append it when the passed template has been truncated. Passing a template will append that template instead. |
| __ellipsisWordBoundaries__ | If you pass this attribute, the text won't be truncated at just any character but only at those in the attribute's value. For example `ellipsisWordBoundaries=" "` will allow the text to break at spaces only |
| __ellipsisMayTruncateAtFn__ | Function that lets you specify whether the contents may be truncated at a certain point or not.
| __ellipsisResizeDetection__ | How resize events should be detected - these are the possible values: <ul><li>__resize-observer__: _default_ Use native ResizeObserver (See [Web/API/ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) and [que-etc/resize-observer-polyfill](https://github.com/que-etc/resize-observer-polyfill))</li><li>__window__: Only listen if the whole window has been resized/changed orientation (Possibly better performance, but obviously won't trigger on resize caused directly or indirectly by javascript.)</li><li>__manual__: Ellipsis is never applied automatically. Instead the consuming app may use `#ell="ellipsis"` in the template and `this.ell.applyEllipsis()` in the component code.</li></ul> |
| __ellipsisChange__ | Event emitter - Will be emitted whenever the ellipsis has been recalculated (depending on `ellipsisResizeDetection`). If the text had to be truncated the position of the last visible character will be emitted, else `null`.|

## Build & publish on npm

In case you want to contribute/fork:

1. Run `npm install`
1. Adept version and author in `./projects/ngx-ellipsis/package.json` and commit the changes to your fork.
1. Run `npm run build-lib` which outputs the build to `./dist/ngx-ellipsis`.
1. Copy README.md to `./dist/ngx-ellipsis` and modify it accordingly.
1. Run `cd ./dist/ngx-ellipsis && npm publish`.


## Running unit tests

Run `npm run test ngx-ellipsis` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Thank you...

- ... __Denis Rul__ for writing the [resize-observer-polyfill](https://github.com/que-etc/resize-observer-polyfill) package which is internally used by this module.

## License

MIT
