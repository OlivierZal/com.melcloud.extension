import { describe, expect, it } from 'vitest'

import { toThresholds } from '../../lib/to-thresholds.mts'

describe(toThresholds, () => {
  it('should keep every finite reading, zero and negatives included', () => {
    expect(
      toThresholds({ 'ac-1': 23, 'ac-2': 0, 'ac-3': -5, 'ac-4': 21.5 }),
    ).toStrictEqual({ 'ac-1': 23, 'ac-2': 0, 'ac-3': -5, 'ac-4': 21.5 })
  })

  it('should accept an empty map as an empty map, not as nothing stored', () => {
    expect(toThresholds({})).toStrictEqual({})
  })

  it('should return a fresh object the caller may mutate', () => {
    const payload = { 'ac-1': 23 }
    const sanitized = toThresholds(payload)

    expect(sanitized).not.toBe(payload)
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['a numeric string', '23'],
    ['null', null],
    ['undefined', undefined],
    ['a boolean', true],
  ])(
    'should drop an entry whose value is %s, keeping its neighbours',
    (_description, value) => {
      expect(
        toThresholds({ 'ac-1': 23, 'ac-2': value, 'ac-3': 19 }),
      ).toStrictEqual({ 'ac-1': 23, 'ac-3': 19 })
    },
  )

  it.each([
    ['a string', 'garbage'],
    ['a number', 42],
    ['an array', []],
    ['null', null],
    ['undefined', undefined],
  ])('should read %s as nothing stored', (_description, payload) => {
    expect(toThresholds(payload)).toBeNull()
  })
})
