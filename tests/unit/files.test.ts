import { describe, expect, it } from 'vitest'

import { changelog } from '../../files.mts'

describe('changelog', () => {
  it('should map version keys to locale records', () => {
    const entries = Object.entries(
      changelog as Record<string, Record<string, string>>,
    )

    expect(entries.length).toBeGreaterThan(0)
    expect(
      entries.every(
        ([version, entry]) =>
          /^\d+\.\d+\.\d+$/v.test(version) &&
          Object.values(entry).every((text) => typeof text === 'string'),
      ),
    ).toBe(true)
  })
})
