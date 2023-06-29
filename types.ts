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

export interface OutdoorTemperatureListener {
  device: HomeyAPIV3Local.ManagerDevices.Device
  temperature?: DeviceCapability
}

export interface MELCloudListener extends OutdoorTemperatureListener {
  thermostatMode?: DeviceCapability
}

export interface Log {
  message: string
  error?: boolean
}
