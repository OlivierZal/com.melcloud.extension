import type { ListenerParams } from '../types.mts'

export class ListenerError extends Error {
  public constructor(message: string, cause?: ListenerParams) {
    super(`error.${message}`, { cause })
  }

  public override get cause(): ListenerParams | undefined {
    return this.cause
  }
}
