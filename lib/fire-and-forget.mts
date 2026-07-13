/**
 * Runs an async operation that shouldn't block. Rejections go to `onError`
 * without blocking the caller.
 */
export const fireAndForget = (
  promise: Promise<unknown>,
  onError: (error: unknown) => void,
): void => {
  // eslint-disable-next-line unicorn/prefer-await -- fire-and-forget: rejections route to onError without blocking the caller
  promise.catch(onError)
}
