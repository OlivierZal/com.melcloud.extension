declare module 'homey-api' {
  export class HomeyAPIV3Local {
    readonly devices: HomeyAPIV3Local.ManagerDevices

    // The SDK instance, spelled inline: a top-level `import type` would
    // turn this script into a module and this ambient declaration into an
    // augmentation of homey-api's own types, which it replaces on purpose.
    static createAppAPI(options: {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- the inline form is the one that keeps the file a script
      homey: import('homey').Homey
    }): Promise<HomeyAPIV3Local>

    call(options: { method: string; path: string }): Promise<unknown>
  }

  export namespace HomeyAPIV3Local {
    export class ManagerDevices {
      connect(): Promise<void>

      getCapabilityValue(options: {
        capabilityId: string
        deviceId: string
      }): Promise<boolean | number | string | null>

      getDevice(options: { id: string }): Promise<ManagerDevices.Device>

      getDevices(): Promise<Record<string, ManagerDevices.Device>>

      on(event: string, callback: (...args: unknown[]) => void): void
    }
  }

  export namespace HomeyAPIV3Local.ManagerDevices {
    export class Capability {
      readonly id: string

      readonly max?: number

      readonly title: string
    }

    export class Device {
      readonly capabilities: string[]

      readonly capabilitiesObj: Record<string, Capability> | null

      readonly data: { readonly id?: unknown }

      readonly driverId: string

      readonly id: string

      readonly name: string

      makeCapabilityInstance(
        capabilityId: string,
        listener: (value: boolean | number | string) => Promise<void> | void,
      ): Device.DeviceCapability

      setCapabilityValue(options: {
        capabilityId: string
        value: boolean | number | string
      }): Promise<void>
    }
  }

  export namespace HomeyAPIV3Local.ManagerDevices.Device {
    export class DeviceCapability {
      destroy(): void

      setValue(value: boolean | number | string): Promise<void>
    }
  }
}
