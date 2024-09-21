import type { ListenerParams } from '../types'

export default class extends Error {
  public constructor(message: string, cause?: ListenerParams) {
    super(`error.${message}`, { cause })
  }
}
