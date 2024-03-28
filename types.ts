import type { HomeyAPIV3Local } from 'homey-api'

export const DEFAULT_0 = 0

export interface Capability {
  id: string
  title: string
}

export interface ListenerEventParams {
  readonly capability?: string
  readonly id?: string
  readonly name?: string
  readonly outdoorTemperature?: string
  readonly threshold?: string
  readonly value?: boolean | number | string
}

export interface TimestampedLog {
  readonly category?: string
  readonly message: string
  readonly time: number
}

export type Thresholds = Partial<Record<string, number>>

export interface HomeySettings {
  readonly capabilityPath: `${string}:${string}` | null
  readonly enabled: boolean | null
  readonly lastLogs: TimestampedLog[] | null
  readonly thresholds: Thresholds | null
}

export interface HomeySettingsUI {
  readonly capabilityPath?: `${string}:${string}`
  readonly enabled?: boolean
  readonly lastLogs?: readonly TimestampedLog[]
  readonly thresholds?: Thresholds
}

export interface TemperatureSensor {
  readonly capabilityName: string
  readonly capabilityPath: `${string}:${string}`
}

export interface TemperatureListenerData {
  readonly capabilityPath: TemperatureSensor['capabilityPath']
  readonly enabled: boolean
}

export type DeviceCapability =
  // @ts-expect-error: `homey-api` is partially typed
  HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability
