export const MEASURE_TEMPERATURE = 'measure_temperature'
export const OUTDOOR_TEMPERATURE = 'measure_temperature.outdoor'

export interface AdjustableDevice {
  readonly id: string
  readonly name: string
  readonly outdoorSource: string | null
}

export interface HomeySettings {
  readonly capabilityPath?: string | null
  readonly isEnabled?: boolean | null
  readonly lastLogs?: TimestampedLog[] | null
  readonly notifiedVersion?: string | null
  readonly outdoorSources?: OutdoorSources | null
  readonly thresholds?: Thresholds | null
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

export interface Names {
  readonly device: string
  readonly homeyWeather: string
  readonly outdoorTemperature: string
  readonly temperature: string
  readonly thermostatMode: string
}

// Explicit per-device opt-out: the device is not adjusted at all
export const DISABLED_SOURCE = 'none'

// Per-device outdoor feed: a "deviceId:capabilityId" path, DISABLED_SOURCE
// to leave the device alone, or null for the Homey weather default.
export type OutdoorSources = Partial<Record<string, string | null>>

export interface TemperatureListenerData {
  readonly isEnabled: boolean
  readonly outdoorSources: OutdoorSources
}

export interface TemperatureSensor {
  readonly capabilityName: string
  readonly capabilityPath: string
}

export type Thresholds = Partial<Record<string, number>>

export interface TimestampedLog {
  readonly message: string
  readonly time: number
  readonly category?: string
}
