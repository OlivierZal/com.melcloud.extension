// Bundles the settings page into a single self-contained ES module served
// statically by Homey, inlining npm dependencies (temporal-polyfill) so the
// webview works offline with versions pinned by the lockfile.
import { build } from 'esbuild'

await build({
  bundle: true,
  entryPoints: ['settings/index.mts'],
  format: 'esm',
  legalComments: 'none',
  logLevel: 'info',
  minify: true,
  outfile: 'settings/index.mjs',
  target: ['es2020'],
})
