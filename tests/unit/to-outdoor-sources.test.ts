import { describe, expect, it } from 'vitest'

import { toOutdoorSources } from '../../lib/to-outdoor-sources.mts'

describe(toOutdoorSources, () => {
  it('should keep every well-shaped entry, null included', () => {
    expect(
      toOutdoorSources({
        'ac-1': 'sensor-1:measure_temperature',
        'ac-2': 'none',
        'ac-3': null,
      }),
    ).toStrictEqual({
      'ac-1': 'sensor-1:measure_temperature',
      'ac-2': 'none',
      'ac-3': null,
    })
  })

  it('should accept an empty map as an empty map, not as nothing stored', () => {
    expect(toOutdoorSources({})).toStrictEqual({})
  })

  it('should return a fresh object the caller may mutate', () => {
    const payload = { 'ac-1': null }
    const sanitized = toOutdoorSources(payload)

    expect(sanitized).not.toBe(payload)
  })

  it.each([
    ['a number', 21],
    ['a boolean', true],
    ['an object', { nested: true }],
    ['an array', ['sensor-1:measure_temperature']],
    ['undefined', undefined],
  ])(
    'should drop an entry whose value is %s, keeping its neighbours',
    (_description, value) => {
      expect(
        toOutdoorSources({ 'ac-1': 'none', 'ac-2': value, 'ac-3': null }),
      ).toStrictEqual({ 'ac-1': 'none', 'ac-3': null })
    },
  )

  it.each([
    ['a string', 'garbage'],
    ['a number', 42],
    ['an array', []],
    ['null', null],
    ['undefined', undefined],
  ])('should read %s as nothing stored', (_description, payload) => {
    expect(toOutdoorSources(payload)).toBeNull()
  })
})
