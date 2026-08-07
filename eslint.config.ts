import { homeyApp } from '@olivierzal/configs/eslint/homey-app'
import { type Config, defineConfig } from 'eslint/config'

const config: Config[] = defineConfig([
  { ignores: ['.homeybuild/', 'coverage/'] },
  ...homeyApp({
    bundledSourceGlobs: [],
    defaultExportFiles: ['**/api.mts', 'app.mts'],
    jsdocFiles: [
      '{api,app,files,types}.mts',
      'lib/**/*.mts',
      'listeners/**/*.mts',
    ],
    // No drivers, so no untyped SDK doubles — but the preset requires a
    // non-empty glob (ESLint rejects `files: []`), so this one matches
    // nothing by design.
    untypedDoubleTestFiles: ['tests/none/**'],
    webviewFloorFiles: ['settings/**/*.mts'],
  }),
  {
    // Ambient declaration files: `declare module` blocks parse as scripts,
    // and typing the homey-api surface requires several merged classes in
    // the single augmented module.
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/explicit-member-accessibility': 'off',
      'import-x/unambiguous': 'off',
      'max-classes-per-file': 'off',
    },
  },
  {
    // The family preset tolerates wire vocabularies (snake_case
    // capability ids as object keys) in app sources; this app has no
    // drivers and spells no capability map in main code, so it keeps
    // the stricter camelCase-only property policy.
    files: ['**/*.{ts,mts}'],
    ignores: ['*.config.{js,ts}', 'tests/**'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
          selector: 'default',
          trailingUnderscore: 'forbid',
        },
        {
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          selector: 'variable',
        },
        { format: null, modifiers: ['destructured'], selector: 'variable' },
        {
          format: ['PascalCase'],
          prefix: [
            'are',
            'can',
            'did',
            'has',
            'have',
            'is',
            'requires',
            'should',
            'was',
            'were',
            'will',
          ],
          selector: ['variable', 'parameter', 'classProperty'],
          types: ['boolean'],
        },
        {
          format: ['camelCase'],
          leadingUnderscore: 'require',
          modifiers: ['unused'],
          selector: 'parameter',
        },
        {
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
          selector: 'parameter',
        },
        {
          format: ['camelCase'],
          selector: [
            'function',
            'classMethod',
            'objectLiteralMethod',
            'typeMethod',
          ],
        },
        {
          format: ['camelCase'],
          selector: ['objectLiteralProperty', 'typeProperty'],
        },
        {
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          selector: 'classProperty',
        },
        { format: ['camelCase', 'PascalCase'], selector: 'import' },
        { format: ['PascalCase'], selector: 'typeLike' },
        { format: ['PascalCase'], prefix: ['T'], selector: 'typeParameter' },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Test doubles mirror external contracts the app code never spells
      // out as literal keys: Homey capability ids (snake_case, dotted,
      // hyphenated device ids) and module export names (PascalCase).
      '@typescript-eslint/naming-convention': [
        'error',
        {
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
          selector: 'default',
          trailingUnderscore: 'forbid',
        },
        {
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          selector: 'variable',
        },
        { format: null, modifiers: ['destructured'], selector: 'variable' },
        {
          format: ['camelCase'],
          leadingUnderscore: 'require',
          modifiers: ['unused'],
          selector: 'parameter',
        },
        {
          filter: { match: true, regex: '^__$' },
          format: null,
          selector: 'objectLiteralProperty',
        },
        {
          format: ['camelCase', 'PascalCase', 'snake_case'],
          selector: ['objectLiteralProperty', 'typeProperty'],
        },
        {
          format: null,
          modifiers: ['requiresQuotes'],
          selector: ['objectLiteralProperty', 'typeProperty'],
        },
        { format: ['camelCase', 'PascalCase'], selector: 'import' },
        { format: ['PascalCase'], selector: 'typeLike' },
        { format: ['PascalCase'], prefix: ['T'], selector: 'typeParameter' },
      ],
    },
  },
])

export default config
