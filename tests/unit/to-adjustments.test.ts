import { describe, expect, it } from 'vitest'

import { toAdjustments } from '../../lib/to-adjustments.mts'

const OWED = { previous: 21, written: 26 }

describe(toAdjustments, () => {
  it('should keep a complete entry', () => {
    expect(toAdjustments({ 'ac-1': OWED })).toStrictEqual({ 'ac-1': OWED })
  })

  it('should accept an empty map as an empty map, not as nothing stored', () => {
    expect(toAdjustments({})).toStrictEqual({})
  })

  it('should return a fresh object the caller may mutate', () => {
    const payload = { 'ac-1': OWED }
    const sanitized = toAdjustments(payload)

    expect(sanitized).not.toBe(payload)
  })

  it.each([
    ['a missing previous', { written: 26 }],
    ['a missing written', { previous: 21 }],
    ['a non-finite previous', { previous: Number.NaN, written: 26 }],
    ['a numeric string', { previous: '21', written: 26 }],
    ['a null member', { previous: 21, written: null }],
    ['no members at all', {}],
    ['a non-record value', 26],
  ])(
    // A half-written entry cannot be given back nor recognised as ours,
    // so it reads as absent — which leaves the device alone.
    'should drop an entry with %s, keeping its neighbours',
    (_description, value) => {
      expect(
        toAdjustments({ 'ac-1': OWED, 'ac-2': value, 'ac-3': OWED }),
      ).toStrictEqual({ 'ac-1': OWED, 'ac-3': OWED })
    },
  )

  it.each([
    ['a string', 'garbage'],
    ['a number', 42],
    ['an array', []],
    ['null', null],
    ['undefined', undefined],
  ])('should read %s as nothing stored', (_description, payload) => {
    expect(toAdjustments(payload)).toBeNull()
  })
})
