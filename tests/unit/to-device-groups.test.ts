import { describe, expect, it } from 'vitest'

import { toDeviceGroups } from '../../lib/to-device-groups.mts'

describe(toDeviceGroups, () => {
  it('should accept a well-shaped payload', () => {
    const payload = [{ deviceIds: ['1', 'uuid'], name: 'Domicile' }]

    expect(toDeviceGroups(payload)).toBe(payload)
  })

  it.each([
    ['a non-array payload', { deviceIds: [], name: 'x' }],
    ['a group without name', [{ deviceIds: ['1'] }]],
    ['a group with a non-string name', [{ deviceIds: ['1'], name: 2 }]],
    ['a group without deviceIds', [{ name: 'x' }]],
    ['a group with non-string ids', [{ deviceIds: [1], name: 'x' }]],
    ['a null payload', null],
  ])('should read %s as no grouping', (_description, payload) => {
    expect(toDeviceGroups(payload)).toBeNull()
  })
})
