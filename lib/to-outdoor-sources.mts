import type { OutdoorSources } from '../types.mts'
import { isRecord } from './is-record.mts'

const isEntry = (entry: [string, unknown]): entry is [string, string | null] =>
  entry[1] === null || typeof entry[1] === 'string'

// Sanitizes the persisted per-device sources. The container is
// all-or-nothing and an entry is individual: a garbage map is not a
// collection of user decisions, while a garbage entry sits beside nine
// good ones and must not take them down. `null` is MEANINGFUL (the
// Homey weather default) and is never dropped, and an absent key is
// never materialised — `#seedOutdoorSources` tells the two apart with
// `Object.hasOwn`. `null` is returned rather than `{}` so callers can
// distinguish "nothing stored" from "an empty map was stored".
//
// The path itself is deliberately not validated: `#listenToDevice`
// already reports a source it cannot resolve and skips that device
// while the others keep running, so checking the shape here would turn
// a visible, recoverable failure into a silent disappearance.
export const toOutdoorSources = (payload: unknown): OutdoorSources | null =>
  isRecord(payload)
    ? Object.fromEntries(Object.entries(payload).filter(isEntry))
    : null
