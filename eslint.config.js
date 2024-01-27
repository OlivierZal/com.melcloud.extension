const js = require('@eslint/js')
const prettier = require('eslint-config-prettier')
const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const importPlugin = require('eslint-plugin-import')
const globals = require('globals')

module.exports = [
  { ignores: ['.homeybuild/'] },
  {
    rules: {
      ...js.configs.all.rules,
      ...importPlugin.configs.recommended.rules,
      'max-lines': 'off',
      'no-magic-numbers': ['error', { ignore: [0] }],
      'no-ternary': 'off',
      'no-underscore-dangle': ['error', { allow: ['__'] }],
      'one-var': 'off',
    },
  },
  { files: ['**/*.js'], languageOptions: { globals: globals.node } },
  {
    files: ['**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
      ...tsPlugin.configs.all.rules,
      ...importPlugin.configs.typescript.rules,

      '@typescript-eslint/no-magic-numbers': ['error', { ignore: [0] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: 'onHomeyReady' },
      ],
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      'import/extensions': 'off',
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
      sourceType: 'module',
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    plugins: { import: importPlugin },
    settings: {
      ...importPlugin.configs.typescript.settings,
      'import/resolver': {
        ...importPlugin.configs.typescript.settings['import/resolver'],
        typescript: { alwaysTryTypes: true },
      },
    },
  },
  prettier,
]
