// Bundles the settings page into a single self-contained ES module served
// statically by Homey, inlining npm dependencies (temporal-polyfill) so the
// webview works offline with versions pinned by the lockfile.
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

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

// Cache-bust the static references: the phone webviews cache settings
// assets across app versions, so a content hash per file forces a refetch
// exactly when a file changes.
const hashOf = async (path) => {
  const content = await readFile(path)
  return createHash('sha256').update(content).digest('hex').slice(0, 8)
}

const htmlPath = 'settings/index.html'
const html = await readFile(htmlPath, 'utf8')
const stamped = html
  .replace(
    /index\.mjs(?:\?v=[0-9a-f]+)?/u,
    `index.mjs?v=${await hashOf('settings/index.mjs')}`,
  )
  .replace(
    /styles\.css(?:\?v=[0-9a-f]+)?/u,
    `styles.css?v=${await hashOf('settings/styles.css')}`,
  )
if (stamped !== html) {
  await writeFile(htmlPath, stamped)
}
