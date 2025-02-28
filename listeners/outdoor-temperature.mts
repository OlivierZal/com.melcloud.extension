import { ListenerError } from './error.mts'
import { MELCloudListener } from './melcloud.mts'
import { TemperatureListener } from './temperature.mts'

import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'
import type { TemperatureListenerData } from '../types.mts'

export class OutdoorTemperatureListener extends TemperatureListener {
  static #listener: OutdoorTemperatureListener | null = null

  readonly #capabilityId: string

  #value: number | null = null

  private constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
    capabilityId: string,
  ) {
    super(app, device)
    this.#capabilityId = capabilityId
  }

  public static get temperatureListener():
    | HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability
    | null
    | undefined {
    return this.#listener?.temperatureListener
  }

  public static get value(): number | null {
    return this.#listener ? this.#listener.#value : null
  }

  public static async create(
    app: MELCloudExtensionApp,
    { capabilityPath, isEnabled }: TemperatureListenerData,
  ): Promise<void> {
    const { capabilityId, device } = await this.#validateCapabilityPath(
      app,
      capabilityPath,
    )
    app.homey.settings.set('capabilityPath', capabilityPath)
    app.homey.settings.set('isEnabled', isEnabled)
    this.#listener = new this(app, device, capabilityId)
    if (isEnabled) {
      await this.#listener.#listenToThermostatModes()
    }
  }

  public static async destroy(): Promise<void> {
    if (this.#listener) {
      await this.destroyTemperature()
      this.#listener = null
    }
  }

  public static async destroyTemperature(): Promise<void> {
    await this.#listener?.destroyTemperature()
  }

  public static async listenToOutdoorTemperature(): Promise<void> {
    if (this.#listener) {
      this.#listener.#value = Number(
        await this.#listener.getCapabilityValue(this.#listener.#capabilityId),
      )
      if (this.#listener.temperatureListener === null) {
        this.#listener.temperatureListener =
          this.#listener.device.makeCapabilityInstance(
            this.#listener.#capabilityId,
            async (value) => {
              if (this.#listener) {
                this.#listener.#value = Number(value)
                this.#listener.app.pushToUI('listened', {
                  capability: this.#listener.names['temperature'],
                  name: this.#listener.device.name,
                  value: `${String(value)}\u00A0°C`,
                })
                await Promise.all(
                  [...MELCloudListener.listeners.values()].map(
                    async (listener) => listener.setTargetTemperature(),
                  ),
                )
              }
            },
          )
        this.#listener.app.pushToUI('created', {
          capability: this.#listener.names['temperature'],
          name: this.#listener.device.name,
        })
      }
    }
  }

  static async #validateCapabilityPath(
    app: MELCloudExtensionApp,
    capabilityPath: string,
  ): Promise<{
    capabilityId: string
    device: HomeyAPIV3Local.ManagerDevices.Device
  }> {
    const [deviceId, capabilityId] = capabilityPath.split(':')
    try {
      const device = await app.api.devices.getDevice({ id: deviceId })
      if (
        capabilityId === undefined ||
        !(capabilityId in (device.capabilitiesObj ?? {}))
      ) {
        throw new ListenerError('notFound', {
          idOrName: capabilityId,
          type: app.names['outdoorTemperature'],
        })
      }
      return { capabilityId, device }
    } catch (error) {
      throw error instanceof ListenerError ? error : (
          new ListenerError('notFound', {
            idOrName: deviceId,
            type: app.names['device'],
          })
        )
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
