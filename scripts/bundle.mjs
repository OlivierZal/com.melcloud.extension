// Bundles the settings page into `.homeybuild`, the packaged app the
// Homey CLI assembles: the CLI copies the app first and only then runs
// `npm run build`, so anything emitted into the source tree lands too
// late to ship (the com.melcloud #1404 root cause). Outputs stay a
// compat pair — index.js (IIFE) for the current classic-defer HTML,
// index.mjs (ESM) for cached ESM-era HTMLs — and npm dependencies
// (temporal-polyfill) are inlined so the webview works offline with
// versions pinned by the lockfile.
import { createHash } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { build } from 'esbuild'

// The IIFE global the page's inline `onHomeyReady` reads `start` from.
const GLOBAL_NAME = 'MELCloudWebview'

// The Homey CLI's packaging target: `tsc` already emits here (its
// validated `outDir`), and the CLI packs exactly this directory.
const OUT_ROOT = '.homeybuild'

const sharedOptions = {
  bundle: true,
  entryPoints: ['settings/index.mts'],
  legalComments: 'none',
  logLevel: 'info',
  minify: true,
  target: ['es2020'],
}

await Promise.all([
  build({
    ...sharedOptions,
    format: 'iife',
    globalName: GLOBAL_NAME,
    outfile: path.join(OUT_ROOT, 'settings/index.js'),
  }),
  build({
    ...sharedOptions,
    format: 'esm',
    outfile: path.join(OUT_ROOT, 'settings/index.mjs'),
  }),
])

// Courtesy cleanup: builds predating the `.homeybuild` emission left
// bundles in the source tree. The CLI would copy them into the package,
// where this build immediately overwrites them — harmless, but they
// linger confusingly in the working tree.
await Promise.all(
  ['settings/index.js', 'settings/index.mjs'].map(async (file) =>
    rm(file, { force: true }),
  ),
)

// Cache-bust the PACKAGED page: phone webviews cache assets across app
// versions, so a content hash per file forces a refetch exactly when a
// file changes. The committed source HTML stays unstamped — `?v=` is a
// package-time transform of the `.homeybuild` copy, which exists in the
// CLI flow (its pre-process copy runs before `npm run build`) and is
// absent in a standalone suite run, which only proves the bundles
// compile.
const hashOf = async (filePath) => {
  const content = await readFile(filePath)
  return createHash('sha256').update(content).digest('hex').slice(0, 8)
}

const htmlPath = path.join(OUT_ROOT, 'settings/index.html')
let html = ''
try {
  html = await readFile(htmlPath, 'utf8')
} catch {
  html = ''
}
if (html !== '') {
  const directory = path.dirname(htmlPath)
  // A local asset reference: an attribute value (href/src) or a dynamic
  // import specifier, with an optional existing stamp.
  const reference =
    /(href="|src="|import\('\.\/)([^"':?/][^"':?]*)(?:\?v=[0-9a-f]+)?(["')])/gu
  // Hash each referenced asset up front — the replace below is sync.
  const hashes = new Map()
  for (const [, , file] of html.matchAll(reference)) {
    if (!hashes.has(file)) {
      hashes.set(file, await hashOf(path.join(directory, file)))
    }
  }
  // Stamp only within a reference context, so the same filename written
  // elsewhere (e.g. a comment) is never rewritten.
  const stamped = html.replaceAll(
    reference,
    (_match, prefix, file, suffix) =>
      `${prefix}${file}?v=${hashes.get(file)}${suffix}`,
  )
  if (stamped !== html) {
    await writeFile(htmlPath, stamped)
  }
}
