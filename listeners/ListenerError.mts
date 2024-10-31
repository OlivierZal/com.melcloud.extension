import type { ListenerParams } from '../types.mjs'

export class ListenerError extends Error {
  public constructor(message: string, cause?: ListenerParams) {
    super(`error.${message}`, { cause })
  }
}
