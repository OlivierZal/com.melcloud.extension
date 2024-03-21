/* eslint-disable
  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
*/
import type {
  CapabilityValue,
  DeviceCapability,
  TemperatureListenerData,
} from '../types'
import BaseTemperatureListener from './BaseTemperatureListener'
import type { HomeyAPIV3Local } from 'homey-api'
import ListenerError from './ListenerEventError'
import type MELCloudExtensionApp from '../app'
import MELCloudListener from './MELCloudListener'

export default class OutdoorTemperatureListener extends BaseTemperatureListener {
  static #listener: OutdoorTemperatureListener | null = null

  #value: number | null = null

  readonly #capabilityId: string

  private constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
    capabilityId: string,
  ) {
    super(app, device)
    this.#capabilityId = capabilityId
  }

  public static get temperatureListener(): DeviceCapability {
    return this.#listener?.temperatureListener
  }

  public static get value(): number | null {
    return this.#listener ? this.#listener.#value : null
  }

  public static async create(
    app: MELCloudExtensionApp,
    { capabilityPath, enabled }: TemperatureListenerData,
  ): Promise<void> {
    try {
      const [device, capabilityId]: [
        HomeyAPIV3Local.ManagerDevices.Device,
        string,
      ] = await this.#validateCapabilityPath(app, capabilityPath)
      this.#listener = new this(app, device, capabilityId)
      if (enabled) {
        await this.#listener.#listenToThermostatModes()
      }
    } catch (error: unknown) {
      if (error instanceof ListenerError) {
        throw new ListenerError(app.homey, error.name, error.params)
      }
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }

  public static destroy(): void {
    if (this.#listener) {
      this.destroyTemperature()
      this.#listener = null
    }
  }

  public static destroyTemperature(): void {
    if (this.#listener) {
      this.#listener.destroyTemperature()
    }
  }

  public static async listenToOutdoorTemperature(): Promise<void> {
    if (this.#listener !== null) {
      this.#listener.#value = (await this.#listener.getCapabilityValue(
        this.#listener.#capabilityId,
      )) as number
      if (this.#listener.temperatureListener === null) {
        this.#listener.temperatureListener =
          this.#listener.device.makeCapabilityInstance(
            this.#listener.#capabilityId,
            async (value: CapabilityValue): Promise<void> => {
              if (this.#listener !== null) {
                this.#listener.#value = value as number
                this.#listener.app.pushToUI('listener.listened', {
                  capability: this.#listener.names.temperature,
                  name: this.#listener.device.name,
                  value: `${value}\u00A0°C`,
                })
                await Promise.all(
                  Array.from(MELCloudListener.listeners.values()).map(
                    async (listener: MELCloudListener): Promise<void> =>
                      listener.setTargetTemperature(),
                  ),
                )
              }
            },
          )
        this.#listener.app.pushToUI('listener.created', {
          capability: this.#listener.names.temperature,
          name: this.#listener.device.name,
        })
      }
    }
  }

  static async #validateCapabilityPath(
    app: MELCloudExtensionApp,
    capabilityPath: string,
  ): Promise<[HomeyAPIV3Local.ManagerDevices.Device, string]> {
    const [deviceId, capabilityId]: string[] = capabilityPath.split(':')
    let device: HomeyAPIV3Local.ManagerDevices.Device | null = null
    try {
      // @ts-expect-error: `homey-api` is partially typed
      device = (await app.api.devices.getDevice({
        id: deviceId,
      })) as HomeyAPIV3Local.ManagerDevices.Device | null
    } catch (error: unknown) {
      throw new ListenerError(app.homey, 'error.not_found', {
        id: deviceId,
        name: app.names.device,
      })
    }
    // @ts-expect-error: `homey-api` is partially typed
    if (!device || !(capabilityId in (device.capabilitiesObj ?? {}))) {
      throw new ListenerError(app.homey, 'error.not_found', {
        id: capabilityId,
        name: app.names.outdoorTemperature,
      })
    }
    return [device, capabilityId]
  }

  async #listenToThermostatModes(): Promise<void> {
    await Promise.all(
      this.app.melcloudDevices.map(
        async (device: HomeyAPIV3Local.ManagerDevices.Device): Promise<void> =>
          new MELCloudListener(this.app, device).listenToThermostatMode(),
      ),
    )
  }
}
