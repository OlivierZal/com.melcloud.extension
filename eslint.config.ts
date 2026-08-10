import { homeyApp } from '@olivierzal/configs/eslint/homey-app'
import { type Config, defineConfig } from 'eslint/config'

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
    // `types.mts` is cross-surface: the settings bundle emits its
    // constants (measured by metafile), so it carries the floor too.
    webviewFloorFiles: ['settings/**/*.mts', 'types.mts'],
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
])

export default config
