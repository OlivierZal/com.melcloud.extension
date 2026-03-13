import type { ListenerParams } from '../types.mts'

export class ListenerError extends Error {
  public override name = 'ListenerError'

  public override readonly cause?: ListenerParams

  public constructor(message: string, cause?: ListenerParams) {
    super(`error.${message}`, { cause })
  }
}
