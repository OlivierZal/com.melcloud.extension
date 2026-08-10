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
    // Shipped node code keeps `u`-flag regexes: the `v` flag is a
    // parse-time SyntaxError on older Homey Pro (2016-2019) firmwares
    // (pre-Node-20 runtime) — the 2026-08 boot-crash root cause in the
    // sibling apps.
    files: ['*.mts', 'lib/**/*.mts'],
    rules: { 'require-unicode-regexp': ['error', { requireFlag: 'u' }] },
  },
])

export default config
