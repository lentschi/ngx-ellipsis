export default {
  entry: 'dist/index.js',
  dest: 'dist/bundles/ngxEllipsis.umd.js',
  sourceMap: false,
  format: 'umd',
  moduleName: 'ng.ngxEllipsis',
  globals: {
    '@angular/core': 'ng.core'
  }
}