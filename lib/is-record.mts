// Narrows to an indexable shape before `Object.entries`, which would
// otherwise resolve to its `[string, any][]` overload and drag `any`
// through every caller.
export const isRecord = (
  payload: unknown,
): payload is Record<string, unknown> =>
  typeof payload === 'object' && payload !== null && !Array.isArray(payload)
