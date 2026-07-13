import { describe, expect, it } from 'vitest'

import { formatTemperature } from '../../lib/format-temperature.mts'

describe(formatTemperature, () => {
  it.each([
    [20, '20\u{A0}°C'],
    ['21.5', '21.5\u{A0}°C'],
    [true, 'true\u{A0}°C'],
    [null, 'null\u{A0}°C'],
  ])('should format %j with a non-breaking space', (value, expected) => {
    expect(formatTemperature(value)).toBe(expected)
  })
})
