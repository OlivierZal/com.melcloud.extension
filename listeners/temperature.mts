import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'

// Shared device binding for temperature listeners: capability value
// retrieval and release of the monitored capability instance.
export abstract class TemperatureListener {
  protected readonly app: MELCloudExtensionApp

  protected readonly device: HomeyAPIV3Local.ManagerDevices.Device

  protected readonly names: MELCloudExtensionApp['names']

  protected temperatureListener: HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability | null =
    null

  protected constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
  ) {
    this.app = app
    this.device = device
    this.names = app.names
  }

  protected async getCapabilityValue(
    capabilityId: string,
  ): Promise<boolean | number | string | null> {
    return this.app.api.devices.getCapabilityValue({
      capabilityId,
      deviceId: this.device.id,
    })
  }

  protected releaseTemperatureListener(): void {
    if (this.temperatureListener === null) {
      return
    }
    this.temperatureListener.destroy()
    this.temperatureListener = null
    this.app.pushToUI('cleaned', {
      capability: this.names.temperature,
      name: this.device.name,
    })
  }
}
