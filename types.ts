import { type HomeyAPIV3Local } from 'homey-api'

export type Settings = Record<string, any>

export interface CapabilityObj {
  id: string
  title: string
}

export interface MeasureTemperatureDevice {
  readonly capabilityName: string
  readonly capabilityPath: string
}

export interface OutdoorTemperatureListenerData {
  readonly capabilityPath: string
  readonly enabled: boolean
}

// @ts-expect-error bug
type DeviceCapability = HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability

interface Listener {
  device: HomeyAPIV3Local.ManagerDevices.Device
}

export interface OutdoorTemperatureListener extends Listener {
  temperature?: DeviceCapability
}

export interface MELCloudListener extends Listener {
  target_temperature?: DeviceCapability
  thermostat_mode?: DeviceCapability
}

export interface Log {
  time: string
  message: string
  error?: boolean
}
