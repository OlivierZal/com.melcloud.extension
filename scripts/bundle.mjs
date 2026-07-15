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
// exactly when a file changes. Local files referenced from attributes —
// the stylesheet `href` and the static module script `src` — get the same
// stamp on every occurrence (the regex also covers a bare `import('./…')`,
// none currently in the page).
const hashOf = async (path) => {
  const content = await readFile(path)
  return createHash('sha256').update(content).digest('hex').slice(0, 8)
}

const htmlPath = 'settings/index.html'
const html = await readFile(htmlPath, 'utf8')
const files = new Set(
  [
    ...html.matchAll(
      /(?:href="|src="|import\('\.\/)(?<file>[^"':?/][^"':?]*)(?:\?v=[0-9a-f]+)?["')]/gu,
    ),
  ].map((match) => match.groups.file),
)
let stamped = html
for (const file of files) {
  const hash = await hashOf(`settings/${file}`)
  const escaped = file.replaceAll('.', String.raw`\.`)
  stamped = stamped.replaceAll(
    new RegExp(String.raw`${escaped}(?:\?v=[0-9a-f]+)?`, 'gu'),
    `${file}?v=${hash}`,
  )
}
if (stamped !== html) {
  await writeFile(htmlPath, stamped)
}
