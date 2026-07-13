import type { ListenerParams } from '../types.mts'

// `message` is a locale key (rendered as `<category>.<messageId>` by the
// settings UI); `cause` carries the interpolation params for that message.
export class ListenerError extends Error {
  declare public readonly cause?: ListenerParams

  public override name = 'ListenerError'

  public constructor(message: string, options?: { cause?: ListenerParams }) {
    super(message, options)
  }
}
