import type { ListenerEventParams } from '../types'

export default class extends Error {
  public readonly params?: ListenerEventParams

  public constructor(message: string, params?: ListenerEventParams) {
    super(message)
    this.params = params
  }
}
