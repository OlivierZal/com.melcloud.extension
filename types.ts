import type { HomeyAPIV3Local } from 'homey-api'

export const MEASURE_TEMPERATURE = 'measure_temperature'
export const OUTDOOR_TEMPERATURE = `${MEASURE_TEMPERATURE}.outdoor`

export interface Capability {
  id: string
  title: string
}

export type Value = boolean | number | string | null

export type CapabilityPath = `${string}:${string}`

export interface ListenerEventParams {
  readonly capability?: string
  readonly idOrName?: string
  readonly name?: string
  readonly outdoorTemperature?: string
  readonly threshold?: string
  readonly type?: string
  readonly value?: Value
}

export interface TimestampedLog {
  readonly category?: string
  readonly message: string
  readonly time: number
}

export type Thresholds = Partial<Record<string, number>>

export interface HomeySettings {
  readonly capabilityPath: CapabilityPath | null
  readonly isEnabled: boolean | null
  readonly lastLogs: TimestampedLog[] | null
  readonly thresholds: Thresholds | null
}

export type HomeySettingsUI = Partial<NonNullable<HomeySettings>>

export interface TemperatureSensor {
  readonly capabilityName: string
  readonly capabilityPath: CapabilityPath
}

export interface TemperatureListenerData {
  readonly capabilityPath: CapabilityPath
  readonly isEnabled: boolean
}

export type DeviceCapability =
  // @ts-expect-error: `homey-api` is partially typed
  HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability
