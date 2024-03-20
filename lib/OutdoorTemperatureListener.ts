/* eslint-disable
@typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
*/
import {
  type CapabilityValue,
  DEFAULT_0,
  type TemperatureListenerData,
} from '../types'
import BaseTemperatureListener from './BaseTemperatureListener'
import type { HomeyAPIV3Local } from 'homey-api'
import ListenerEvent from './ListenerEvent'
import ListenerEventError from './ListenerEventError'
import type MELCloudExtensionApp from '../app'
import MELCloudListener from './MELCloudListener'

export default class OutdoorTemperatureListener extends BaseTemperatureListener {
  static #listener: OutdoorTemperatureListener | null = null

  #value: number = DEFAULT_0

  readonly #capabilityId: string

  private constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
    capabilityId: string,
  ) {
    super(app, device)
    this.#capabilityId = capabilityId
  }

  public static get listener(): OutdoorTemperatureListener | null {
    return this.#listener
  }

  public get value(): number {
    return this.#value
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
      if (error instanceof ListenerEventError) {
        throw new ListenerEventError(app.homey, error.name, error.params)
      }
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }

  public static destroy(): void {
    if (this.#listener) {
      this.#listener.destroy()
      this.#listener = null
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
      throw new ListenerEventError(app.homey, 'error.not_found', {
        id: deviceId,
        name: app.names.device,
      })
    }
    // @ts-expect-error: `homey-api` is partially typed
    if (!device || !(capabilityId in (device.capabilitiesObj ?? {}))) {
      throw new ListenerEventError(app.homey, 'error.not_found', {
        id: capabilityId,
        name: app.names.outdoorTemperature,
      })
    }
    return [device, capabilityId]
  }

  public async listenToOutdoorTemperature(): Promise<void> {
    this.#value = (await this.getCapabilityValue(this.#capabilityId)) as number
    if (this.temperatureListener === null) {
      this.temperatureListener = this.device.makeCapabilityInstance(
        this.#capabilityId,
        async (value: CapabilityValue): Promise<void> => {
          this.#value = value as number
          this.app.log(
            new ListenerEvent(this.app.homey, 'listener.listened', {
              capability: this.app.names.temperature,
              name: this.device.name,
              value: `${value}\u00A0°C`,
            }),
          )
          await Promise.all(
            Array.from(MELCloudListener.listeners.values()).map(
              async (listener: MELCloudListener): Promise<void> =>
                listener.setTargetTemperature(),
            ),
          )
        },
      )
      this.app.log(
        new ListenerEvent(this.app.homey, 'listener.created', {
          capability: this.app.names.temperature,
          name: this.device.name,
        }),
      )
    }
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
