import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The bundler is a top-level-await script working against the current
// directory (the Homey CLI runs it from the packaged app's root), so
// each test materializes a miniature app in a temp directory, moves
// there, and imports the script afresh. What is pinned here is this
// app's own bundling decisions — the compat pair, the packaging root
// and the page list handed to the kit's stamp producer; the stamping
// itself is the kit's contract, locked by its own suite.
const initialDirectory = process.cwd()

const ENTRY_SOURCE = `export const start = (value?: string): string =>
  value ?? 'booted'
`

const PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <link href="styles.css" rel="stylesheet" />
    <script defer src="index.js"></script>
  </head>
  <body></body>
</html>
`

const STAMP = /\?v=[0-9a-f]{8}"/v

// Cwd-relative on purpose: every test runs from inside its own temp
// app, exactly where the Homey CLI runs the script from.
const seedApp = async (): Promise<void> => {
  await mkdir('settings', { recursive: true })
  await writeFile('settings/index.mts', ENTRY_SOURCE)
}

const seedPackagedPage = async (): Promise<void> => {
  await mkdir('.homeybuild/settings', { recursive: true })
  await writeFile('.homeybuild/settings/index.html', PAGE_HTML)
  await writeFile('.homeybuild/settings/styles.css', 'body { color: red; }\n')
}

const runBundler = async (): Promise<void> => {
  vi.resetModules()
  await import('../../scripts/bundle.mts')
}

const packagedFile = async (relativePath: string): Promise<string> =>
  readFile(path.join('.homeybuild', relativePath), 'utf8')

describe('bundle script', () => {
  let workDirectory = ''

  beforeEach(async () => {
    workDirectory = await mkdtemp(path.join(tmpdir(), 'bundle-'))
    process.chdir(workDirectory)
    await seedApp()
  })

  afterEach(async () => {
    process.chdir(initialDirectory)
    await rm(workDirectory, { force: true, recursive: true })
  })

  it('should emit the compat pair into the packaged app', async () => {
    await runBundler()

    const iife = await packagedFile('settings/index.js')
    const esm = await packagedFile('settings/index.mjs')

    expect(iife).toContain('var MELCloudWebview')
    expect(iife).not.toContain('export')
    expect(esm).toContain('export')
    // es2020 target: nullish coalescing ships as-is, unlowered
    expect(iife).toContain('??')
    // A standalone run has no page copy: nothing stamped, no manifest
    await expect(packagedFile('webview-hashes.json')).rejects.toThrow('ENOENT')
  })

  it('should stamp the packaged settings page under its manifest key', async () => {
    await seedPackagedPage()

    await runBundler()

    const stamped = await packagedFile('settings/index.html')
    const manifest: unknown = JSON.parse(
      await packagedFile('webview-hashes.json'),
    )

    expect(stamped).toMatch(STAMP)
    expect(manifest).toHaveProperty('settings', expect.any(String))
  })
})
