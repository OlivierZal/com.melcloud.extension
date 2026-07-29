import { describe, expect, it } from 'vitest'

import { toTimestampedLogs } from '../../lib/to-timestamped-logs.mts'

describe(toTimestampedLogs, () => {
  it('should keep entries with and without a category', () => {
    const payload = [
      { category: 'error', message: 'boom', time: 2 },
      { message: 'plain', time: 1 },
    ]

    expect(toTimestampedLogs(payload)).toStrictEqual(payload)
  })

  it('should accept an empty history as an empty history', () => {
    expect(toTimestampedLogs([])).toStrictEqual([])
  })

  it.each([
    ['a non-object', 'oops'],
    ['null', null],
    ['a missing message', { time: 1 }],
    ['a non-string message', { message: 2, time: 1 }],
    ['a missing time', { message: 'x' }],
    ['a non-number time', { message: 'x', time: 'now' }],
    ['a non-finite time', { message: 'x', time: Number.NaN }],
    ['a non-string category', { category: 1, message: 'x', time: 1 }],
  ])('should drop %s, keeping its neighbours', (_description, entry) => {
    const kept = { message: 'kept', time: 3 }

    expect(toTimestampedLogs([entry, kept])).toStrictEqual([kept])
  })

  it.each([
    ['a string', 'garbage'],
    ['an object', { message: 'x', time: 1 }],
    ['null', null],
    ['undefined', undefined],
  ])('should read %s as nothing stored', (_description, payload) => {
    expect(toTimestampedLogs(payload)).toBeNull()
  })
})
