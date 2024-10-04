import type { ListenerParams } from '../types'

export class ListenerError extends Error {
  public constructor(message: string, cause?: ListenerParams) {
    super(`error.${message}`, { cause })
  }
}
