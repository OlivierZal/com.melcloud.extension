import { readdir, readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

interface DeclaredRoute {
  readonly method: string
  readonly path: string
}

// The call-site half of the API contract: the settings webview may only
// call routes the app manifest declares. Literal paths are extracted
// from the sources and checked against the declared table;
// template-built paths are out of scope by design. The declaration half
// (manifest ids ↔ handlers, both directions, type level) lives in
// api-contract.test.ts. The cross-app probes in app.mts target
// com.melcloud's routes, not this app's — out of scope here.
const SOURCE_DIRS: readonly string[] = ['settings']

const readRoutes = async (): Promise<DeclaredRoute[]> => {
  const manifest = JSON.parse(
    await readFile('.homeycompose/app.json', 'utf8'),
  ) as { api?: Record<string, DeclaredRoute> }
  return Object.values(manifest.api ?? {})
}

const listSourceFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir)
  return entries
    .filter((entry) => entry.endsWith('.mts') || entry.endsWith('.html'))
    .map((entry) => `${dir}/${entry}`)
}

// Comment lines are dropped so a path mentioned in prose is not read as
// a call site.
const stripComments = (source: string): string =>
  source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trimStart()
      return (
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('/*')
      )
    })
    .join('\n')

const extractPathLiterals = (source: string): string[] =>
  stripComments(source)
    .matchAll(/['"](?<path>\/[a-z][\w\-\/]*)['"]/gv)
    .map((match) => match.groups?.path ?? '')
    .toArray()

// The typed helpers carry the verb in their name; the boot beacon calls
// the raw SDK with the verb as its first argument. No declared path of
// this app is served under two verbs today, so the pair check guards
// against the collision arriving rather than one already there — the
// sibling apps each have one (`/sessions` under three verbs in
// com.heatzy), and a call under an unserved verb 404s the same way.
const HELPER_CALL =
  /homeyApi(?<verb>Get|Put|Post|Delete)(?:<[^\(\)]*>)?\s*\(\s*[\w.#]+\s*,\s*['"](?<path>\/[a-z][\w\-\/]*)['"]/gv
const SDK_CALL =
  /homey\.api\(\s*['"](?<verb>[A-Z]+)['"]\s*,\s*['"](?<path>\/[a-z][\w\-\/]*)['"]/gv

// Every helper call site, whatever shape its path takes: the sweeps
// above only prove they found something, this proves they found
// everything.
const HELPER_CALL_SITE = /homeyApi(?:Get|Put|Post|Delete)(?:<[^\(\)]*>)?\s*\(/gv

// `fetchListOrEmpty` takes its path as a parameter and is called with
// literals one hop up, where the bare-path sweep reads them. Counting
// it keeps the accounting complete: a second such helper would show up
// as a shortfall rather than slipping past unread.
const HELPER_INDIRECT_CALL =
  /homeyApi(?:Get|Put|Post|Delete)(?:<[^\(\)]*>)?\s*\(\s*[\w.#]+\s*,\s*[a-z]\w*/gv

const extractRouteCalls = (source: string): DeclaredRoute[] => {
  const stripped = stripComments(source)
  return [
    ...stripped.matchAll(HELPER_CALL).map((match) => ({
      method: (match.groups?.verb ?? '').toUpperCase(),
      path: match.groups?.path ?? '',
    })),
    ...stripped.matchAll(SDK_CALL).map((match) => ({
      method: match.groups?.verb ?? '',
      path: match.groups?.path ?? '',
    })),
  ]
}

const countMatches = (source: string, pattern: RegExp): number =>
  stripComments(source).matchAll(pattern).toArray().length

const dedupeCalls = (calls: DeclaredRoute[]): DeclaredRoute[] => {
  const byPair = new Map<string, DeclaredRoute>()
  for (const call of calls) {
    byPair.set(`${call.method} ${call.path}`, call)
  }
  return byPair.values().toArray()
}

const routeMatches = (routePath: string, literal: string): boolean => {
  const routeSegments = routePath.split('/')
  const literalSegments = literal.split('/')
  return (
    routeSegments.length === literalSegments.length &&
    routeSegments.every(
      (segment, index) =>
        segment.startsWith(':') || segment === literalSegments[index],
    )
  )
}

const readSources = async (): Promise<string[]> => {
  const fileGroups = await Promise.all(
    SOURCE_DIRS.map(async (dir) => listSourceFiles(dir)),
  )
  return Promise.all(
    fileGroups.flat().map(async (file) => readFile(file, 'utf8')),
  )
}

describe('api route guards', () => {
  it('should declare every path the settings webview calls', async () => {
    const routes = await readRoutes()
    const sources = await readSources()
    const literals = sources.flatMap((source) => extractPathLiterals(source))
    const unmatched = [...new Set(literals)].filter((literal) =>
      routes.every((route) => !routeMatches(route.path, literal)),
    )

    expect(unmatched).toStrictEqual([])
  })

  it('should declare every method the settings webview calls each path with', async () => {
    const routes = await readRoutes()
    const sources = await readSources()
    const calls = sources.flatMap((source) => extractRouteCalls(source))
    const unmatched = dedupeCalls(calls).filter((call) =>
      routes.every(
        (route) =>
          route.method !== call.method || !routeMatches(route.path, call.path),
      ),
    )

    expect(unmatched).toStrictEqual([])
  })

  // The checks above pass vacuously on a call the extractors cannot
  // read. Accounting for every call site — parsed, or the one helper
  // taking its path as a parameter — turns that silence into a failure.
  it('should account for every helper call site', async () => {
    const sources = await readSources()
    const callSites = sources.reduce(
      (total, source) => total + countMatches(source, HELPER_CALL_SITE),
      0,
    )
    const indirectCalls = sources.reduce(
      (total, source) => total + countMatches(source, HELPER_INDIRECT_CALL),
      0,
    )
    const parsed = sources.flatMap((source) => extractRouteCalls(source)).length

    expect(callSites).toBeGreaterThan(0)
    expect(parsed + indirectCalls).toBeGreaterThanOrEqual(callSites)
  })
})
