import { describe, expect, it } from 'vitest'

import { getErrorMessage } from '../../lib/get-error-message.mts'

describe(getErrorMessage, () => {
  it.each([
    ['an Error instance', new Error('boom'), 'boom'],
    ['a plain string', 'plain failure', 'plain failure'],
    ['a serializable object', { kind: 'network' }, '{"kind":"network"}'],
  ])('should stringify %s', (_description, error, expected) => {
    expect(getErrorMessage(error)).toBe(expected)
  })
})
