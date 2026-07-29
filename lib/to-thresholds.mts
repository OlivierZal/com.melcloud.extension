import type { Thresholds } from '../types.mts'
import { isRecord } from './is-record.mts'
import { toTemperature } from './to-temperature.mts'

const isEntry = (entry: [string, unknown]): entry is [string, number] =>
  toTemperature(entry[1]) !== null

// Sanitizes the persisted per-device comfort setpoints, on the same
// contract as `toOutdoorSources`: the container is all-or-nothing, an
// entry is individual, and `null` is returned rather than `{}` so
// "nothing stored" stays distinguishable. Finiteness is delegated to
// `toTemperature` so one doctrine covers every reading, stored or live.
//
// No range clamping: `#getTargetTemperature` already bounds the value
// by the device's advertised ceiling, and a dropped entry reads as
// absent — which the revert path refuses to act on rather than
// substituting a number nobody chose.
export const toThresholds = (payload: unknown): Thresholds | null =>
  isRecord(payload)
    ? Object.fromEntries(Object.entries(payload).filter(isEntry))
    : null
