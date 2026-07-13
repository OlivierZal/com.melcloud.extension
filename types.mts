export const MEASURE_TEMPERATURE = 'measure_temperature'
export const OUTDOOR_TEMPERATURE = 'measure_temperature.outdoor'

export interface HomeySettings {
  readonly capabilityPath?: string | null
  readonly isEnabled?: boolean | null
  readonly lastLogs?: TimestampedLog[] | null
  readonly notifiedVersion?: string | null
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
  readonly outdoorTemperature: string
  readonly temperature: string
  readonly thermostatMode: string
}

export interface TemperatureListenerData {
  readonly capabilityPath: string
  readonly isEnabled: boolean
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
