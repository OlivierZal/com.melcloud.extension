import { type HomeyAPIV2 } from 'homey-api'

export type Settings = Record<string, any>

export interface Listener {
  device: HomeyAPIV2.ManagerDevices.Device
  temperature?: HomeyAPIV2.ManagerDevices.Device.DeviceCapability
  thermostatMode?: HomeyAPIV2.ManagerDevices.Device.DeviceCapability
}

export interface MeasureTemperatureDevice {
  readonly capabilityName: string
  readonly capabilityPath: string
}

export interface OutdoorTemperatureListenerData {
  readonly capabilityPath: string
  readonly enabled: boolean
}
