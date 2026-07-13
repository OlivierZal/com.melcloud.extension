import { describe, expect, it } from 'vitest'

import { NotFoundError } from '../../lib/errors.mts'
import { ListenerError } from '../../listeners/error.mts'

describe(ListenerError, () => {
  it('should carry the locale key and the typed cause', () => {
    const cause = { idOrName: 'outdoor', type: 'Device' }

    const error = new ListenerError('error.notFound', { cause })

    expect(error.name).toBe('ListenerError')
    expect(error.message).toBe('error.notFound')
    expect(error.cause).toStrictEqual(cause)
  })

  it('should default to no cause', () => {
    expect(new ListenerError('error.notFound').cause).toBeUndefined()
  })
})

describe(NotFoundError, () => {
  it('should use the message matched by the settings UI', () => {
    const error = new NotFoundError()

    expect(error.name).toBe('NotFoundError')
    expect(error.message).toBe('notFound')
  })
})
