import type { TimestampedLog } from '../types.mts'

// `category` is optional, so absent-or-string is the check — requiring
// it would drop every entry the app writes without one.
const hasValidCategory = (entry: object): boolean =>
  !('category' in entry) || typeof entry.category === 'string'

const isTimestampedLog = (entry: unknown): entry is TimestampedLog =>
  typeof entry === 'object' &&
  entry !== null &&
  'message' in entry &&
  typeof entry.message === 'string' &&
  'time' in entry &&
  typeof entry.time === 'number' &&
  Number.isFinite(entry.time) &&
  hasValidCategory(entry)

// Sanitizes the persisted UI log history. Same contract as the sibling
// sanitizers, and not merely defensive: `#persistLog` spreads this
// value into a new array, so a stored non-iterable would throw inside
// the very call every listener uses to report — turning one bad
// settings value into an app that dies on its first log line.
export const toTimestampedLogs = (payload: unknown): TimestampedLog[] | null =>
  Array.isArray(payload) ? payload.filter(isTimestampedLog) : null
