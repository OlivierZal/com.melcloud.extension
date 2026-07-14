import type { DeviceGroups } from '../types.mts'

const isGroup = (
  entry: unknown,
): entry is { deviceIds: readonly string[]; name: string } =>
  typeof entry === 'object' &&
  entry !== null &&
  'name' in entry &&
  typeof entry.name === 'string' &&
  'deviceIds' in entry &&
  Array.isArray(entry.deviceIds) &&
  entry.deviceIds.every((id) => typeof id === 'string')

// Sanitizes the inter-app payload: anything off-shape reads as "no
// grouping" so the settings fall back to the flat per-device list.
export const toDeviceGroups = (payload: unknown): DeviceGroups | null =>
  Array.isArray(payload) && payload.every(isGroup) ? payload : null
