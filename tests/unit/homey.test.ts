import type { InteropModule } from '@olivierzal/homey-kit/testing'
import type HomeyModule from 'homey'
import { describe, expect, it, vi } from 'vitest'

vi.mock(import('homey'), async () => {
  const { mock: mockModule } = await import('@olivierzal/homey-kit/testing')
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
