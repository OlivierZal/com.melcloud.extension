import type HomeyModule from 'homey'
import { describe, expect, it, vi } from 'vitest'

import type { InteropModule } from '../helpers.ts'

vi.mock(import('homey'), async () => {
  const { mock: mockModule } = await import('../helpers.ts')
  class AppStub {
    public readonly error = vi.fn<(...args: unknown[]) => void>()
  }
  return mockModule<InteropModule<typeof HomeyModule>>({
    default: { App: AppStub },
  })
})

describe('homey', () => {
  it('should re-export the SDK App base class', async () => {
    const { App } = await import('../../lib/homey.mts')

    expect(App).toBeTypeOf('function')
  })
})
