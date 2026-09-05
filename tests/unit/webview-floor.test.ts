import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import {
  analyzeWebviewFloor,
  getQuotedEntries,
} from '@olivierzal/homey-kit/testing'
import { describe, expect, it } from 'vitest'

// The es2023 webview floor must cover every file the settings bundle
// can emit: the bundler's entry point plus every module it reaches
// through a VALUE import — type imports erase at emit, so they pull
// nothing into a bundle. A reached file outside the floor globs would
// ship API the phone engines lack without any lint saying so;
// `types.mts` already ships its constants into the settings bundle,
// which is why the floor names it. Inclusion is the invariant — globs
// cover whole directories by design. The perimeter is read from this
// app's own config files; the closure walk and the glob matching are
// the kit's kernel, and its list reader throws on an empty sweep, so a
// broken extractor cannot equal two empty sets.

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

const readRepoFile = (relativePath: string): string =>
  readFileSync(path.join(REPO_ROOT, relativePath), 'utf8')

describe.concurrent('webview floor closure', () => {
  const entryPoints = getQuotedEntries(
    readRepoFile('scripts/bundle.mts'),
    'entryPoints',
  )
  const findings = analyzeWebviewFloor({
    entryPoints,
    floorGlobs: getQuotedEntries(
      readRepoFile('eslint.config.ts'),
      'webviewFloorFiles',
    ),
    repoRoot: REPO_ROOT,
  })

  // `types.mts` reaches the bundle through a mixed import, so a walk
  // that silently stopped at the seed cannot hide behind a trivial
  // closure here.
  it('follows at least one value-import edge beyond the seed', () => {
    expect(findings.closure.length).toBeGreaterThan(entryPoints.length)
  })

  it('floors every file the settings bundle can emit', () => {
    expect(findings.uncovered).toStrictEqual([])
  })
})
