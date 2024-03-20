/* eslint-disable
  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
*/
import type { DeviceCapability } from '../types'
import type { HomeyAPIV3Local } from 'homey-api'
import ListenerEvent from './ListenerEvent'
import type MELCloudExtensionApp from '../app'

export default abstract class BaseTemperatureListener {
  protected temperatureListener: DeviceCapability = null

  protected readonly app: MELCloudExtensionApp

  protected readonly device: HomeyAPIV3Local.ManagerDevices.Device

  public constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
  ) {
    this.app = app
    this.device = device
  }

  public destroyTemperature(): void {
    if (this.temperatureListener !== null) {
      this.temperatureListener.destroy()
      this.temperatureListener = null
    }
    this.app.log(
      new ListenerEvent(this.app.homey, 'listener.cleaned', {
        capability: this.app.names.temperature,
        name: this.device.name,
      }),
    )
  }

  protected async getCapabilityValue(
    capabilityId: string,
  ): Promise<number | string> {
    return (
      // @ts-expect-error: `homey-api` is partially typed
      (await this.app.api.devices.getCapabilityValue({
        capabilityId,
        deviceId: this.device.id,
      })) as number | string
    )
  }
}
