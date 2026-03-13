import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'
import type { TemperatureListenerData } from '../types.mts'

import { ListenerError } from './error.mts'
import { MELCloudListener } from './melcloud.mts'
import { TemperatureListener } from './temperature.mts'

/*
 * Singleton listener for the outdoor temperature sensor. Creates
 * and coordinates MELCloudListener instances across all AC devices.
 * Monitors the outdoor sensor lazily — only when at least one device
 * enters cooling mode.
 */
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

  /*
   * Starts monitoring the outdoor temperature sensor. On each change,
   * recalculates all MELCloud devices' target temperatures in parallel.
   * Called lazily: only when the first device enters cooling mode.
   */
  public static async listenToOutdoorTemperature(): Promise<void> {
    const listener = this.#listener
    if (!listener) {
      return
    }
    listener.#value = Number(
      await listener.getCapabilityValue(listener.#capabilityId),
    )
    if (listener.temperatureListener !== null) {
      return
    }
    listener.temperatureListener = listener.device.makeCapabilityInstance(
      listener.#capabilityId,
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
              async (melcloudListener) =>
                melcloudListener.setTargetTemperature(),
            ),
          )
        }
      },
    )
    listener.app.pushToUI('created', {
      capability: listener.names['temperature'],
      name: listener.device.name,
    })
  }

  /*
   * Parses a capabilityPath ("deviceId:capabilityId") and validates
   * that both the device and the capability exist
   */
  static async #validateCapabilityPath(
    app: MELCloudExtensionApp,
    capabilityPath: string,
  ): Promise<{
    capabilityId: string
    device: HomeyAPIV3Local.ManagerDevices.Device
  }> {
    const [deviceId = '', capabilityId = ''] = capabilityPath.split(':')
    try {
      const device = await app.api.devices.getDevice({ id: deviceId })
      if (!(capabilityId in (device.capabilitiesObj ?? {}))) {
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
