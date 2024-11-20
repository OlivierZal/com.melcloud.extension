import type { ListenerParams } from '../types.mts'

export class ListenerError extends Error {
  public override cause?: ListenerParams

  public constructor(message: string, cause?: ListenerParams) {
    super(`error.${message}`, { cause })
  }
}
