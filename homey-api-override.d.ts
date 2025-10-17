export class HomeyAPIV3Local {
  devices: HomeyAPIV3Local.ManagerDevices

  static createAppAPI(options: {
    homey: Homey
    debug?: Function | null
  }): Promise<HomeyAPIV3Local>
}

export namespace HomeyAPIV3Local {
  export class ManagerDevices {
    connect(): Promise<any>

    getCapabilityValue(options: {
      capabilityId: string
      deviceId: string
    }): Promise<any>

    getDevice(options: { id: string }): Promise<ManagerDevices.Device>

    getDevices(): Promise<Record<string, ManagerDevices.Device>>

    on(event: string, callback: Function): any
  }
}

export namespace HomeyAPIV3Local.ManagerDevices {
  export class Capability {
    id: string

    title: string
  }

  export class Device {
    capabilities: string[]

    capabilitiesObj: Record<string, Capability> | null

    driverId: string

    id: string

    name: string

    makeCapabilityInstance(
      capabilityId: string,
      listener: (value: boolean | number | string) => any,
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
    value: boolean | number | string | null

    destroy(): any

    setValue(
      value: boolean | number | string,
      options?: { duration?: number },
    ): Promise<any>
  }
}
