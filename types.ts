import type { HomeyAPIV3Local } from 'homey-api'

export type CapabilityValue = boolean | number | string

export interface EventParams {
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

type ValueOf<T> = T[keyof T]

interface BaseHomeySettingsValue<T1, T2, T3, T4> {
  readonly enabled: T1
  readonly capabilityPath: T2
  readonly thresholds: T3
  readonly lastLogs: T4
}

export type HomeySettings = BaseHomeySettingsValue<
  boolean | null,
  string | null,
  Thresholds | null,
  TimestampedLog[] | null
>

export type HomeySettingsUI = BaseHomeySettingsValue<
  boolean | undefined,
  string | undefined,
  Thresholds | undefined,
  TimestampedLog[] | undefined
>

export type HomeySettingKey = keyof HomeySettings

export type HomeySettingValue = ValueOf<HomeySettings>

export interface MeasureTemperatureDevice {
  readonly capabilityName: string
  readonly capabilityPath: string
}

export interface TemperatureListenerData {
  readonly capabilityPath: string
  readonly enabled: boolean
}

export type DeviceCapability =
  // @ts-expect-error: `homey-api` is partially typed
  HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability

interface BaseListener {
  device: HomeyAPIV3Local.ManagerDevices.Device
}

export interface TemperatureListener extends BaseListener {
  temperature?: DeviceCapability
}

export interface MELCloudListener extends TemperatureListener {
  thermostatMode?: DeviceCapability
}
