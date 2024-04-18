import type { ListenerEventParams } from '../types'

export default class ListenerError extends Error {
  public readonly params?: ListenerEventParams

  public constructor(message: string, params?: ListenerEventParams) {
    super(message)
    this.params = params
  }
}
