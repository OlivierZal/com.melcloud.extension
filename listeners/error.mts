import type { ListenerParams } from '../types.mts'

export class ListenerError extends Error {
  public override name = 'ListenerError'

  readonly #cause?: ListenerParams

  public constructor(message: string, cause?: ListenerParams) {
    super(`error.${message}`, { cause })
    this.#cause = cause
  }

  public override get cause(): ListenerParams | undefined {
    return this.#cause
  }
}
