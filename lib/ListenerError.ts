import type { ListenerEventParams } from '../types'

export default class extends Error {
  public constructor(cause?: ListenerEventParams) {
    super('error.notFound', { cause })
  }
}
