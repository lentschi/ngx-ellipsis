module.exports = {
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        // TODO: Remove the next two lines once inputs/outputs are properly named:
        '@angular-eslint/no-input-rename': 'off',
        '@angular-eslint/no-output-rename': 'off',

        '@angular-eslint/directive-selector': [
          'warn',
          { type: 'attribute', prefix: '', style: 'camelCase' },
        ],

        '@angular-eslint/component-selector': [
          'warn',
          { type: 'element', prefix: '', style: 'kebab-case' },
        ],
      },
    }
  ],
};
