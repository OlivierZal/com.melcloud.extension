/* eslint-disable
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-return
*/
import type { DeviceCapability, TemperatureListenerData } from '../types'
import type { HomeyAPIV3Local } from 'homey-api'
import ListenerError from './ListenerError'
import type MELCloudExtensionApp from '../app'
import MELCloudListener from './MELCloudListener'
import TemperatureListener from './TemperatureListener'

export default class OutdoorTemperatureListener extends TemperatureListener {
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
    const [device, capabilityId] = await this.#validateCapabilityPath(
      app,
      capabilityPath,
    )
    app.setHomeySettings({ capabilityPath, enabled })
    this.#listener = new this(app, device, capabilityId)
    if (enabled) {
      await this.#listener.#listenToThermostatModes()
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
            async (value) => {
              if (this.#listener !== null) {
                this.#listener.#value = value as number
                this.#listener.app.pushToUI('listened', {
                  capability: this.#listener.names.temperature,
                  name: this.#listener.device.name,
                  value: `${String(value)}\u00A0°C`,
                })
                await Promise.all(
                  Array.from(MELCloudListener.listeners.values()).map(
                    async (listener) => listener.setTargetTemperature(),
                  ),
                )
              }
            },
          )
        this.#listener.app.pushToUI('created', {
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
    const [deviceId, capabilityId] = capabilityPath.split(':')
    let device: HomeyAPIV3Local.ManagerDevices.Device | null = null
    try {
      // @ts-expect-error: `homey-api` is partially typed
      device = (await app.api.devices.getDevice({
        id: deviceId,
      })) as HomeyAPIV3Local.ManagerDevices.Device
      // @ts-expect-error: `homey-api` is partially typed
      if (!(capabilityId in (device.capabilitiesObj ?? {}))) {
        throw new ListenerError(app.homey, 'error.not_found', {
          id: capabilityId,
          name: app.names.outdoorTemperature,
        })
      }
      return [device, capabilityId]
    } catch (error) {
      if (error instanceof ListenerError) {
        throw error
      }
      throw new ListenerError(app.homey, 'error.not_found', {
        id: deviceId,
        name: app.names.device,
      })
    }
  }

  async #listenToThermostatModes(): Promise<void> {
    await Promise.all(
      this.app.melcloudDevices.map(async (device) =>
        new MELCloudListener(this.app, device).listenToThermostatMode(),
      ),
    )
  }
}
