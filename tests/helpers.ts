// Feeds a deliberately off-shape value where the type forbids one, so a
// sanitizer can be tested against what a hand-edited setting actually
// looks like. Same helper as melcloud-api's; the family-wide helpers
// (`assertDefined`, `mock`, `settleDetached`, `InteropModule`) come from
// `@olivierzal/homey-kit/testing`.
export function cast(value: unknown): never
export function cast(value: unknown): unknown {
  return value
}
