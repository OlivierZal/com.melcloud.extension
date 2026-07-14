import type { HomeyAPIV3Local } from 'homey-api'

import type {
  AdjustableDevice,
  AdjustableGroup,
  DeviceGroups,
  OutdoorSources,
} from '../types.mts'

const toAdjustableDevice = (
  device: HomeyAPIV3Local.ManagerDevices.Device,
  outdoorSources: OutdoorSources,
): AdjustableDevice => ({
  id: device.id,
  name: device.name,
  outdoorSource: outdoorSources[device.id] ?? null,
})

const SORT_BEFORE = -1

// The homey-api device data is app-defined: only the id shapes the
// MELCloud apps actually write can join with the building payload
const toJoinKey = (id: unknown): string | null =>
  typeof id === 'string' || typeof id === 'number' ? String(id) : null

const byName = <T extends { readonly name: string }>(
  entry1: T,
  entry2: T,
): number => entry1.name.localeCompare(entry2.name)

// Buildings are joined on the MELCloud device id carried by the Homey
// device data; same-name buildings (one per dialect for the same house)
// merge into a single row.
const groupByBuilding = (
  devices: readonly HomeyAPIV3Local.ManagerDevices.Device[],
  outdoorSources: OutdoorSources,
  deviceGroups: DeviceGroups,
): AdjustableGroup[] => {
  const nameByMelcloudId = new Map(
    deviceGroups.flatMap(({ deviceIds, name }) =>
      deviceIds.map((id): [string, string] => [id, name]),
    ),
  )
  const grouped = new Map<string | null, AdjustableDevice[]>()
  for (const device of devices) {
    const key = toJoinKey(device.data.id)
    const name = key === null ? null : (nameByMelcloudId.get(key) ?? null)
    const members = grouped.get(name) ?? []
    members.push(toAdjustableDevice(device, outdoorSources))
    grouped.set(name, members)
  }
  return [...grouped]
    .map(([name, members]) => ({
      devices: members.toSorted(byName),
      name,
    }))
    .toSorted((group1, group2) => {
      if (group1.name === null) {
        return 1
      }
      if (group2.name === null) {
        return SORT_BEFORE
      }
      return group1.name.localeCompare(group2.name)
    })
}

// Shapes the settings rows: one named group per building when the
// com.melcloud grouping is available (unmatched devices land in a
// trailing unnamed group rendered per device), or a single unnamed
// flat group otherwise.
export const groupAdjustableDevices = (
  devices: readonly HomeyAPIV3Local.ManagerDevices.Device[],
  outdoorSources: OutdoorSources,
  deviceGroups: DeviceGroups | null,
): AdjustableGroup[] => {
  if (deviceGroups === null) {
    return [
      {
        devices: devices
          .map((device) => toAdjustableDevice(device, outdoorSources))
          .toSorted(byName),
        name: null,
      },
    ]
  }
  return groupByBuilding(devices, outdoorSources, deviceGroups)
}
