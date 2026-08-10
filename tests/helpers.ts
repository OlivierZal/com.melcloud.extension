import { expect } from 'vitest'

// TS requires an explicit type annotation on the called identifier for
// asserts predicates; an annotated arrow satisfies that.
export const assertDefined: <T>(value: T | undefined) => asserts value is T = (
  value,
) => {
  expect(value).toBeDefined()
}

export const mock = <T>(overrides: Partial<Record<keyof T, unknown>> = {}): T =>
  overrides as T

/**
 * Shape served by vitest when a CJS `export =` module (like `homey`) is
 * consumed through ESM default imports: the factory must expose the module
 * under a `default` key its declared type does not have.
 */
export type InteropModule<TModule> = TModule & { default: TModule }

// Feeds a deliberately off-shape value where the type forbids one, so a
// sanitizer can be tested against what a hand-edited setting actually
// looks like. Same helper as melcloud-api's.
export function cast(value: unknown): never
export function cast(value: unknown): unknown {
  return value
}

// Drain the microtask chains a detached (fire-and-forget) run leaves
// behind: one macrotask turn settles them all when the mocks resolve
// synchronously. Same helper as com.heatzy's.
export const settleDetached = async (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve)
  })
