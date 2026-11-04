import { homeyApp } from '@olivierzal/configs/eslint'
import { type Config, defineConfig } from 'eslint/config'

import { webviewFloorFiles } from './scripts/webview-perimeter.mts'

const config: Config[] = defineConfig([
  { ignores: ['.homeybuild/', 'coverage/'] },
  ...homeyApp({
    bundledSourceGlobs: ['settings/**'],
    defaultExportFiles: ['**/api.mts', 'app.mts'],
    jsdocFiles: [
      '{api,app,files,types}.mts',
      'lib/**/*.mts',
      'listeners/**/*.mts',
    ],
    webviewFloorFiles,
  }),
  {
    // Declaration files: the homey-api replacement states the package's
    // surface as several merged classes in one module, and a declaration
    // carries no access modifier.
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/explicit-member-accessibility': 'off',
      'max-classes-per-file': 'off',
    },
  },
])

export default config
