import type { HomeyAPIV3Local } from 'homey-api'

export const DEFAULT_0 = 0

export interface Capability {
  id: string
  title: string
}

export type CapabilityValue = boolean | number | string

export interface ListenerEventParams {
  readonly capability?: string
  readonly id?: string
  readonly name?: string
  readonly outdoorTemperature?: string
  readonly threshold?: string
  readonly value?: CapabilityValue
}

export interface TimestampedLog {
  readonly category?: string
  readonly message: string
  readonly time: number
}

export type Thresholds = Partial<Record<string, number>>

export type ValueOf<T> = T[keyof T]

export interface HomeySettings {
  readonly capabilityPath: `${string}:${string}` | null
  readonly enabled: boolean | null
  readonly lastLogs: TimestampedLog[] | null
  readonly thresholds: Thresholds | null
}

export interface HomeySettingsUI {
  readonly capabilityPath: `${string}:${string}` | undefined
  readonly enabled: boolean | undefined
  readonly lastLogs: readonly TimestampedLog[] | undefined
  readonly thresholds: Thresholds | undefined
}

export interface TemperatureSensor {
  readonly capabilityName: string
  readonly capabilityPath: `${string}:${string}`
}

export interface TemperatureListenerData {
  readonly capabilityPath: `${string}:${string}`
  readonly enabled: boolean
}

export type DeviceCapability =
  // @ts-expect-error: `homey-api` is partially typed
  HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability
