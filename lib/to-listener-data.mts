import type { TemperatureListenerData } from '../types.mts'
import { isRecord } from './is-record.mts'
import { toOutdoorSources } from './to-outdoor-sources.mts'

// Sanitizes the settings page's PUT body before it is persisted
// verbatim. Sanitizing on read while the ingress stays open is half a
// fix: an off-shape body would otherwise become the stored value every
// reader then has to defend against.
//
// Unlike the read-side sanitizers this one cannot degrade to `null` —
// the caller has to act on something — so it falls back to the safe
// pair: adjustment off, no per-device source.
export const toListenerData = (payload: unknown): TemperatureListenerData => ({
  isEnabled: isRecord(payload) && payload.isEnabled === true,
  outdoorSources: isRecord(payload)
    ? (toOutdoorSources(payload.outdoorSources) ?? {})
    : {},
})
