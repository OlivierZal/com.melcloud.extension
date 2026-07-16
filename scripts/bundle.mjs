// Bundles the settings page into a single self-contained CLASSIC script
// served statically by Homey, inlining npm dependencies (temporal-polyfill)
// so the webview works offline with versions pinned by the lockfile. The
// output is an IIFE (format: 'iife') exposing `start` on a global, loaded
// via a plain `<script src>` — NOT an ES module. Module fetches (`import()`
// / `<script type=module>`) stall on a cold webview open against Homey's
// local origin (#1404); classic resource fetches, like the stylesheet,
// load cold.
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

import { build } from 'esbuild'

// The IIFE global the page's inline `onHomeyReady` reads `start` from.
const GLOBAL_NAME = 'MELCloudWebview'

const sharedOptions = {
  bundle: true,
  entryPoints: ['settings/index.mts'],
  legalComments: 'none',
  logLevel: 'info',
  minify: true,
  target: ['es2020'],
}

// The entry builds TWICE. Phone webviews cache the HTML itself across app
// versions (proven on com.melcloud: a cached dynamic-import HTML
// requesting index.mjs against an app shipping only index.js → 404 →
// "Loading failed"), so previously-shipped bundle filenames are a compat
// contract: index.js serves the current classic-defer HTML, index.mjs
// keeps every cached ESM-era HTML working (their import('./index.mjs')
// finds the exported `start`). Never rename or drop a shipped bundle
// filename — add alongside instead.
await Promise.all([
  build({
    ...sharedOptions,
    format: 'iife',
    globalName: GLOBAL_NAME,
    outfile: 'settings/index.js',
  }),
  build({
    ...sharedOptions,
    format: 'esm',
    outfile: 'settings/index.mjs',
  }),
])

// Cache-bust the static references: the phone webviews cache settings
// assets across app versions, so a content hash per file forces a refetch
// exactly when a file changes.
const hashOf = async (path) => {
  const content = await readFile(path)
  return createHash('sha256').update(content).digest('hex').slice(0, 8)
}

const htmlPath = 'settings/index.html'
const html = await readFile(htmlPath, 'utf8')
// A local asset reference: an attribute value (href/src) or a dynamic
// import specifier, with an optional existing stamp.
const reference =
  /(href="|src="|import\('\.\/)([^"':?/][^"':?]*)(?:\?v=[0-9a-f]+)?(["')])/gu
// Hash each referenced asset up front — the replace below is sync.
const hashes = new Map()
for (const [, , file] of html.matchAll(reference)) {
  if (!hashes.has(file)) {
    hashes.set(file, await hashOf(`settings/${file}`))
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
