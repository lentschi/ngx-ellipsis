module.exports = {
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      plugins: ['@typescript-eslint', '@angular-eslint'],
      rules: {
        '@typescript-eslint/array-type': 'off',

        'arrow-parens': 'off',

        '@angular-eslint/component-class-suffix': 'warn',

        '@angular-eslint/contextual-lifecycle': 'warn',

        '@angular-eslint/directive-class-suffix': 'warn',

        '@angular-eslint/directive-selector': [
          'warn',
          { type: 'attribute', prefix: 'app', style: 'camelCase' },
        ],

        '@angular-eslint/component-selector': [
          'warn',
          { type: 'element', prefix: 'app', style: 'kebab-case' },
        ],

        'no-restricted-imports': [
          'warn',
          {
            paths: [
              {
                name: 'rxjs/Rx',
                message: "Please import directly from 'rxjs' instead",
              },
            ],
          },
        ],

        '@typescript-eslint/interface-name-prefix': 'off',

        'max-classes-per-file': 'off',

        'max-len': ['warn', { code: 140 }],

        '@typescript-eslint/explicit-member-accessibility': 'off',

        '@typescript-eslint/member-ordering': [
          'warn',
          {
            default: [
              'static-field',
              'instance-field',
              'static-method',
              'instance-method',
            ],
          },
        ],

        'no-multiple-empty-lines': 'off',

        'no-restricted-syntax': [
          'warn',
          {
            selector:
              'CallExpression[callee.object.name="console"][callee.property.name=/^(debug|info|time|timeEnd|trace)$/]',
            message: 'Unexpected property on console object was called',
          },
        ],

        'no-empty': 'off',

        '@typescript-eslint/no-inferrable-types': [
          'warn',
          {
            ignoreParameters: true,
          },
        ],

        '@typescript-eslint/no-non-null-assertion': 'warn',

        'no-fallthrough': 'warn',

        '@typescript-eslint/no-var-requires': 'off',

        'quote-props': ['warn', 'as-needed'],

        'sort-keys': 'off',

        /**
         * Needs import plugin
         */

        quotes: ['warn', 'single'],

        'comma-dangle': 'off',

        '@angular-eslint/no-conflicting-lifecycle': 'warn',

        '@angular-eslint/no-host-metadata-property': 'warn',

        '@angular-eslint/no-input-rename': 'warn',

        '@angular-eslint/no-inputs-metadata-property': 'warn',

        '@angular-eslint/no-output-native': 'warn',

        '@angular-eslint/no-output-on-prefix': 'warn',

        '@angular-eslint/no-output-rename': 'warn',

        '@angular-eslint/no-outputs-metadata-property': 'warn',

        '@angular-eslint/use-lifecycle-interface': 'warn',

        '@angular-eslint/use-pipe-transform-interface': 'warn',
      },
    },
    {
      files: ['*.component.html'],
      parser: '@angular-eslint/template-parser',
      plugins: ['@angular-eslint/template'],
      rules: {
        '@angular-eslint/template/banana-in-a-box': 'warn',

        '@angular-eslint/template/no-negated-async': 'warn',
      },
    }
  ],
};
