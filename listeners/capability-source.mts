import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'
import { ListenerError } from './error.mts'
import { OutdoorSource } from './outdoor-source.mts'

// Outdoor feed backed by a device capability ("deviceId:capabilityId"),
// watched through a Homey capability instance.
export class CapabilityOutdoorSource extends OutdoorSource {
  public readonly name: string

  readonly #capabilityId: string

  #capabilityInstance: HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability | null =
    null

  readonly #device: HomeyAPIV3Local.ManagerDevices.Device

  private constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
    capabilityId: string,
  ) {
    super(app)
    this.#device = device
    this.#capabilityId = capabilityId
    this.name = device.name
  }

  // Validates the capability path before construction: both the device
  // and the capability must exist.
  public static async create(
    app: MELCloudExtensionApp,
    capabilityPath: string,
  ): Promise<CapabilityOutdoorSource> {
    const [deviceId = '', capabilityId = ''] = capabilityPath.split(':')
    const device = await this.#getDevice(app, deviceId)
    if (device.capabilitiesObj?.[capabilityId] === undefined) {
      throw new ListenerError('error.notFound', {
        cause: { idOrName: capabilityId, type: app.names.outdoorTemperature },
      })
    }
    return new this(app, device, capabilityId)
  }

  static async #getDevice(
    app: MELCloudExtensionApp,
    deviceId: string,
  ): Promise<HomeyAPIV3Local.ManagerDevices.Device> {
    try {
      return await app.api.devices.getDevice({ id: deviceId })
    } catch {
      throw new ListenerError('error.notFound', {
        cause: { idOrName: deviceId, type: app.names.device },
      })
    }
  }

  protected async start(): Promise<void> {
    this.initialize(
      await this.app.api.devices.getCapabilityValue({
        capabilityId: this.#capabilityId,
        deviceId: this.#device.id,
      }),
    )
    this.#capabilityInstance = this.#device.makeCapabilityInstance(
      this.#capabilityId,
      async (value) => this.update(value),
    )
    this.app.pushToUI('created', {
      capability: this.app.names.temperature,
      name: this.name,
    })
  }

  protected stop(): void {
    if (this.#capabilityInstance === null) {
      return
    }
    this.#capabilityInstance.destroy()
    this.#capabilityInstance = null
    this.app.pushToUI('cleaned', {
      capability: this.app.names.temperature,
      name: this.name,
    })
  }
}
