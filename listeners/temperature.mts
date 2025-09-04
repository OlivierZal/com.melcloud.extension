import type { HomeyAPIV3 } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'

export abstract class TemperatureListener {
  protected readonly app: MELCloudExtensionApp

  protected readonly device: HomeyAPIV3.ManagerDevices.Device

  protected readonly names: Record<string, string>

  protected temperatureListener: HomeyAPIV3.ManagerDevices.Device.DeviceCapability | null =
    null

  protected constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3.ManagerDevices.Device,
  ) {
    this.app = app
    this.device = device
    ;({ names: this.names } = app)
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async destroyTemperature(): Promise<void> {
    if (this.temperatureListener !== null) {
      this.temperatureListener.destroy()
      this.temperatureListener = null
    }
    this.app.pushToUI('cleaned', {
      capability: this.names['temperature'],
      name: this.device.name,
    })
  }

  protected async getCapabilityValue(capabilityId: string): Promise<unknown> {
    return this.app.api.devices.getCapabilityValue({
      capabilityId,
      deviceId: this.device.id,
    })
  }
}
