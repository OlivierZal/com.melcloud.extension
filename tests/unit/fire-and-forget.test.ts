import { describe, expect, it, vi } from 'vitest'

import { fireAndForget } from '../../lib/fire-and-forget.mts'

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

describe(fireAndForget, () => {
  it('should not call onError when the promise resolves', async () => {
    const onError = vi.fn<(error: unknown) => void>()

    fireAndForget(Promise.resolve('ok'), onError)
    await flushMicrotasks()

    expect(onError).toHaveBeenCalledTimes(0)
  })

  it('should route rejections to onError without throwing', async () => {
    const onError = vi.fn<(error: unknown) => void>()
    const error = new Error('boom')

    fireAndForget(Promise.reject(error), onError)
    await flushMicrotasks()

    expect(onError).toHaveBeenCalledWith(error)
  })
})
