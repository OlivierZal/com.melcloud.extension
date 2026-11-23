import { readdirSync, readFileSync } from 'node:fs'

import { findLocaleDrift } from '@olivierzal/homey-kit/testing'
import { describe, expect, it } from 'vitest'

const SOURCES = '.homeycompose/locales'

const readLocale = (language: string): unknown =>
  JSON.parse(readFileSync(`${SOURCES}/${language}.json`, 'utf8'))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// Every path to a text, e.g. `log.reverted`.
const keyPaths = (value: unknown, prefix = ''): string[] =>
  isRecord(value)
    ? Object.entries(value).flatMap(([key, child]) =>
        keyPaths(child, prefix === '' ? key : `${prefix}.${key}`),
      )
    : [prefix]

const languages = readdirSync(SOURCES).map((file) => file.replace('.json', ''))

// What the app's own sources push to the History: `'error.<id>'`
// anywhere, and the plain id a `pushToUI` call names.
const appSources = [
  'app.mts',
  ...readdirSync('listeners').map((file) => `listeners/${file}`),
]
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')

const pushedMessages = [
  ...appSources.matchAll(/'error\.(?<id>\w+)'/gv),
  ...appSources.matchAll(/pushToUI\(\s*'(?<id>\w+)'/gv),
].map(({ groups }) => groups?.id ?? '')

describe('locale sources', () => {
  // The Homey CLI merges a source into the generated file it finds: a
  // text written in `locales/*.json` alone survives every build and is
  // lost the day the file is generated afresh, and a text the source
  // dropped is never removed. The comparison is the kit's: texts and
  // wordings, and a language that has only one of the two files.
  it('should generate exactly what the sources declare', async () => {
    await expect(findLocaleDrift('.')).resolves.toStrictEqual([])
  })

  it.each([...new Set(pushedMessages)])(
    'should declare the "%s" message the app pushes',
    (id) => {
      expect(keyPaths(readLocale('en'))).toContain(`log.${id}`)
    },
  )

  it.each(languages)('should give "%s" every text English has', (language) => {
    expect(new Set(keyPaths(readLocale(language)))).toStrictEqual(
      new Set(keyPaths(readLocale('en'))),
    )
  })
})
