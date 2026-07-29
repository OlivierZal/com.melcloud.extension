import { describe, expect, it } from 'vitest'

import { toListenerData } from '../../lib/to-listener-data.mts'

describe(toListenerData, () => {
  it('should keep a well-shaped body', () => {
    expect(
      toListenerData({
        isEnabled: true,
        outdoorSources: { 'ac-1': 'none', 'ac-2': null },
      }),
    ).toStrictEqual({
      isEnabled: true,
      outdoorSources: { 'ac-1': 'none', 'ac-2': null },
    })
  })

  it.each([
    ['a string body', 'oops'],
    ['a null body', null],
    ['an array body', []],
    ['an off-shape outdoorSources', { isEnabled: true, outdoorSources: 'x' }],
    ['a missing outdoorSources', { isEnabled: true }],
  ])('should fall back to no source for %s', (_description, payload) => {
    expect(toListenerData(payload).outdoorSources).toStrictEqual({})
  })

  it.each([
    ['a non-boolean isEnabled', { isEnabled: 'true' }],
    ['a missing isEnabled', { outdoorSources: {} }],
    ['a null body', null],
  ])('should read %s as disabled', (_description, payload) => {
    expect(toListenerData(payload).isEnabled).toBe(false)
  })
})
