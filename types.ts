export type MELCloudDriverId = 'melcloud' | 'melcloud_atw'

export interface OutdoorTemperatureListenerForAtaData {
  readonly capabilityPath: string
  readonly enabled: boolean
  readonly threshold: number
}
