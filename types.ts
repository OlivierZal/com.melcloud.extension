export type Settings = Record<string, any>

export interface OutdoorTemperatureListenerData {
  readonly capabilityPath: string
  readonly enabled: boolean
}

export interface Listener {
  device: {
    id: string
    name: string
    capabilitiesObj: any
    io: any
    makeCapabilityInstance: (
      capability: string,
      onCapability: (value: number) => Promise<void>
    ) => { value: number, destroy: () => void }
  }
  temperature: ReturnType<Listener['device']['makeCapabilityInstance']>
}

export interface MelCloudListener extends Listener {
  thermostatMode: ReturnType<Listener['device']['makeCapabilityInstance']>
}
