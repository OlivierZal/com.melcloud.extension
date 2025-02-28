import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'

export abstract class TemperatureListener {
  protected readonly app: MELCloudExtensionApp

  protected readonly device: HomeyAPIV3Local.ManagerDevices.Device

  protected readonly names: Record<string, string>

  protected temperatureListener: HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability | null =
    null

  protected constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
  ) {
    this.app = app
    this.device = device
    ;({ names: this.names } = app)
  }

  protected async destroyTemperature(): Promise<void> {
    if (this.temperatureListener !== null) {
      this.temperatureListener.destroy()
      this.temperatureListener = null
    }
    this.app.pushToUI('cleaned', {
      capability: this.names['temperature'],
      name: this.device.name,
    })
    return Promise.resolve()
  }

  protected async getCapabilityValue(capabilityId: string): Promise<unknown> {
    return this.app.api.devices.getCapabilityValue({
      capabilityId,
      deviceId: this.device.id,
    })
  }
}
