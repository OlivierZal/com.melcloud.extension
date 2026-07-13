// Thrown when no adjustable MELCloud AC device exists yet. The settings UI
// matches on the `notFound` message to offer installing the MELCloud app.
export class NotFoundError extends Error {
  public override name = 'NotFoundError'

  public constructor() {
    super('notFound')
  }
}
