import type { HomeyAPIV3Local } from 'homey-api'

export const DEFAULT_0 = 0

export interface Capability {
  id: string
  title: string
}

export type CapabilityPath = `${string}:${string}`

export interface ListenerEventParams {
  readonly capability?: string
  readonly idOrName?: string
  readonly name?: string
  readonly outdoorTemperature?: string
  readonly threshold?: string
  readonly type?: string
  readonly value?: boolean | number | string
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

export interface HomeySettingsUI {
  readonly capabilityPath?: CapabilityPath
  readonly enabled?: boolean
  readonly lastLogs?: readonly TimestampedLog[]
  readonly thresholds?: Thresholds
}

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
