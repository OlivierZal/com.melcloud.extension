import type { HomeyAPIV3Local } from 'homey-api'

export const MEASURE_TEMPERATURE = 'measure_temperature'
export const OUTDOOR_TEMPERATURE = `${MEASURE_TEMPERATURE}.outdoor`

export interface Capability {
  id: string
  title: string
}

export interface HomeySettings {
  readonly capabilityPath: string | null
  readonly isEnabled: boolean | null
  readonly lastLogs: TimestampedLog[] | null
  readonly notifiedVersion: string | null
  readonly thresholds: Thresholds | null
}

export interface ListenerParams {
  readonly capability?: string
  readonly idOrName?: string
  readonly name?: string
  readonly outdoorTemperature?: string
  readonly threshold?: string
  readonly type?: string
  readonly value?: unknown
}

export interface TemperatureListenerData {
  readonly capabilityPath: string
  readonly isEnabled: boolean
}

export interface TemperatureSensor {
  readonly capabilityName: string
  readonly capabilityPath: string
}

export interface TimestampedLog {
  readonly message: string
  readonly time: number
  readonly category?: string
}

export type DeviceCapability =
  // @ts-expect-error: `homey-api` is partially typed
  HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability

export type HomeySettingsUI = Partial<NonNullable<HomeySettings>>

export type Thresholds = Partial<Record<string, number>>
