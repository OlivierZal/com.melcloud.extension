// Bundles the settings page into `.homeybuild`, the packaged app the
// Homey CLI assembles: the CLI copies the app first and only then runs
// `npm run build`, so anything emitted into the source tree lands too
// late to ship (the com.melcloud #1404 root cause). Outputs stay a
// compat pair — index.js (IIFE) for the current classic-defer HTML,
// index.mjs (ESM) for cached ESM-era HTMLs — and npm dependencies
// (temporal-polyfill) are inlined so the webview works offline with
// versions pinned by the lockfile.
import path from 'node:path'

import { stampPackagedPages } from '@olivierzal/homey-kit/node'
import { type BuildOptions, build } from 'esbuild'

// The IIFE global the page's inline `onHomeyReady` reads `start` from.
const GLOBAL_NAME = 'MELCloudWebview'

// The Homey CLI's packaging target: `tsc` already emits here (its
// validated `outDir`), and the CLI packs exactly this directory.
const OUT_ROOT = '.homeybuild'

const entryPoints = ['settings/index.mts']

// The packaged page, with the manifest key under which the app serves
// its bundle hash (`GET /webview-hashes`): a booted page compares its
// own `?v=` against the live value and reloads itself once when the
// webview cache served a stale copy.
const pages = [{ entry: 'settings', page: 'settings/index.html' }]

const sharedOptions: BuildOptions = {
  // Pinned at load: esbuild's service process outlives this module and
  // keeps its own working directory, so relative entries must be
  // anchored to the app root explicitly.
  absWorkingDir: process.cwd(),
  bundle: true,
  legalComments: 'none',
  logLevel: 'info',
  minify: true,
  target: ['es2020'],
}

await Promise.all(
  entryPoints.flatMap((entryPoint) => {
    const outBase = path.join(OUT_ROOT, entryPoint.replace(/\.mts$/v, ''))
    return [
      build({
        ...sharedOptions,
        entryPoints: [entryPoint],
        format: 'iife',
        globalName: GLOBAL_NAME,
        outfile: `${outBase}.js`,
      }),
      build({
        ...sharedOptions,
        entryPoints: [entryPoint],
        format: 'esm',
        outfile: `${outBase}.mjs`,
      }),
    ]
  }),
)

// Cache-bust the PACKAGED page: the kit stamps every local asset
// reference of the `.homeybuild` copy with a content hash (`?v=`) and
// emits the live-hash manifest the app serves. The committed source
// HTML stays unstamped — the copy exists only in the CLI flow (its
// pre-process copy runs before `npm run build`); a standalone suite run
// has no copy, stamps nothing and only proves the bundles compile,
// while a partial tree fails the packaging pass rather than shipping a
// release with a silently disabled handshake.
await stampPackagedPages(OUT_ROOT, pages)
