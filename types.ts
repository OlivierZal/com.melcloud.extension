export const DRIVER_ID = 'homey:app:com.mecloud:melcloud'

import type { HomeyAPIV3Local } from 'homey-api'

export interface Capability {
  id: string
  title: string
}

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

export type ValueOf<T> = T[keyof T]

interface BaseHomeySettings<T1, T2, T3, T4> {
  readonly capabilityPath: T1
  readonly enabled: T2
  readonly lastLogs: T3
  readonly thresholds: T4
}

export type HomeySettings = BaseHomeySettings<
  string | null,
  boolean | null,
  TimestampedLog[] | null,
  Thresholds | null
>

export type HomeySettingsUI = BaseHomeySettings<
  string | undefined,
  boolean | undefined,
  readonly TimestampedLog[] | undefined,
  Thresholds | undefined
>

export interface TemperatureSensor {
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
  temperature: DeviceCapability
}

export interface MELCloudListener extends TemperatureListener {
  thermostatMode: DeviceCapability
}
