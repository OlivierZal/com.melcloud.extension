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
