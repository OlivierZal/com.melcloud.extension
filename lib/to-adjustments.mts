import type { Adjustment, Adjustments } from '../types.mts'
import { isRecord } from './is-record.mts'
import { toTemperature } from './to-temperature.mts'

const isEntry = (entry: [string, unknown]): entry is [string, Adjustment] => {
  const [, value] = entry
  return (
    isRecord(value) &&
    toTemperature(value.previous) !== null &&
    toTemperature(value.written) !== null
  )
}

// Sanitizes the persisted outstanding adjustments, on the same contract
// as `toThresholds`: the container is all-or-nothing, an entry is
// individual, and `null` is returned rather than `{}` so "nothing
// stored" stays distinguishable.
//
// A half-written entry reads as absent, which is the safe direction: the
// settlement then leaves the device alone instead of commanding a
// temperature it cannot justify. Both members are required — one without
// the other could neither be given back nor recognised as ours.
export const toAdjustments = (payload: unknown): Adjustments | null =>
  isRecord(payload)
    ? Object.fromEntries(Object.entries(payload).filter(isEntry))
    : null
