declare module 'homey-api' {
  export class HomeyAPIV3Local {
    readonly devices: HomeyAPIV3Local.ManagerDevices

    static createAppAPI(options: {
      homey: Homey
      debug?: ((...args: unknown[]) => void) | null
    }): Promise<HomeyAPIV3Local>
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

      readonly title: string
    }

    export class Device {
      readonly capabilities: string[]

      readonly capabilitiesObj: Record<string, Capability> | null

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
        opts?: { duration?: number }
      }): Promise<void>
    }
  }

  export namespace HomeyAPIV3Local.ManagerDevices.Device {
    export class DeviceCapability {
      readonly value: boolean | number | string | null

      destroy(): void

      setValue(
        value: boolean | number | string,
        options?: { duration?: number },
      ): Promise<void>
    }
  }
}
