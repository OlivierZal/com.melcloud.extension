import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '..'
import type { DeviceCapability, TemperatureListenerData } from '../types'

import ListenerError from './ListenerError'
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
    app.setHomeySettings({ capabilityPath, isEnabled })
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
      this.#listener.#value = (await this.#listener.getCapabilityValue(
        this.#listener.#capabilityId,
      )) as number
      if (this.#listener.temperatureListener === null) {
        this.#listener.temperatureListener =
          this.#listener.device.makeCapabilityInstance(
            this.#listener.#capabilityId,
            async (value) => {
              if (this.#listener) {
                this.#listener.#value = value as number
                this.#listener.app.pushToUI('listened', {
                  capability: this.#listener.names.temperature,
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
          capability: this.#listener.names.temperature,
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
      // @ts-expect-error: `homey-api` is partially typed
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const device = (await app.api.devices.getDevice({
        id: deviceId,
      })) as HomeyAPIV3Local.ManagerDevices.Device
      // @ts-expect-error: `homey-api` is partially typed
      if (!(capabilityId in (device.capabilitiesObj ?? {}))) {
        throw new ListenerError({
          idOrName: capabilityId,
          type: app.names.outdoorTemperature,
        })
      }
      return { capabilityId, device }
    } catch (error) {
      throw error instanceof ListenerError ? error : (
          new ListenerError({ idOrName: deviceId, type: app.names.device })
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
