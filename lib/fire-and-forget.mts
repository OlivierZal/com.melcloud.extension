/**
 * Runs an async operation that shouldn't block. Rejections go to `onError`
 * without blocking the caller.
 * @param promise - The async operation to run detached.
 * @param onError - Receives the rejection reason if `promise` rejects.
 */
export const fireAndForget = (
  promise: Promise<unknown>,
  onError: (error: unknown) => void,
): void => {
  // eslint-disable-next-line unicorn/prefer-await -- fire-and-forget: rejections route to onError without blocking the caller
  promise.catch(onError)
}
