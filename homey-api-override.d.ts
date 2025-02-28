declare module 'homey-api' {
  interface HomeyAPIV3Local {
    devices: {
      connect: () => Promise<void>
      getCapabilityValue: (options: {
        capabilityId: string
        deviceId: string
      }) => Promise<unknown>
      getDevice: ({
        id,
      }: {
        id?: string
      }) => Promise<HomeyAPIV3Local.ManagerDevices.Device>
      getDevices: () => Promise<HomeyAPIV3Local.ManagerDevices.Device[]>
      on: (
        event: 'device.create' | 'device.delete',
        listener: () => void,
      ) => void
    }
  }

  namespace HomeyAPIV3Local {
    namespace ManagerDevices {
      interface Capability {
        title: string
      }

      interface Device {
        capabilities: string[]
        capabilitiesObj: Record<string, Capability> | null
        driverId: string
      }

      namespace Device {
        interface DeviceCapability {
          value: unknown
          destroy: () => void
          setValue: (value: boolean | number | string) => Promise<void>
        }
      }
    }
  }
}

export {}
