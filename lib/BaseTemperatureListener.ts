/* eslint-disable
  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
*/
import type { DeviceCapability } from '../types'
import type { HomeyAPIV3Local } from 'homey-api'
import type MELCloudExtensionApp from '../app'

export default abstract class BaseTemperatureListener {
  protected temperatureListener: DeviceCapability = null

  protected readonly app: MELCloudExtensionApp

  protected readonly device: HomeyAPIV3Local.ManagerDevices.Device

  protected readonly names: Record<string, string>

  public constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
  ) {
    this.app = app
    this.names = app.names
    this.device = device
  }

  protected destroyTemperature(): void {
    if (this.temperatureListener !== null) {
      this.temperatureListener.destroy()
      this.temperatureListener = null
    }
    this.app.pushToUI('listener.cleaned', {
      capability: this.names.temperature,
      name: this.device.name,
    })
  }

  protected async getCapabilityValue(
    capabilityId: string,
  ): Promise<boolean | number | string | null> {
    return (
      // @ts-expect-error: `homey-api` is partially typed
      (await this.app.api.devices.getCapabilityValue({
        capabilityId,
        deviceId: this.device.id,
      })) as boolean | number | string | null
    )
  }
}
