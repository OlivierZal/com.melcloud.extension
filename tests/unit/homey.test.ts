import type { InteropModule } from '@olivierzal/homey-kit/testing'
import type HomeyModule from 'homey'
import { describe, expect, it, vi } from 'vitest'

import { App } from '../../lib/homey.mts'

const { appBase } = vi.hoisted(() => ({ appBase: vi.fn<() => void>() }))

vi.mock(import('homey'), async () => {
  const { mock: mockModule } = await import('@olivierzal/homey-kit/testing')
  return mockModule<InteropModule<typeof HomeyModule>>({
    default: { App: appBase },
  })
})

describe('homey re-exports', () => {
  it('should re-export App from the homey SDK', () => {
    expect(App).toBe(appBase)
  })
})
