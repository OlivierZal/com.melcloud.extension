import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'
import type { TemperatureListenerData } from '../types.mts'
import { formatTemperature } from '../lib/format-temperature.mts'
import { ListenerError } from './error.mts'
import { MELCloudListener } from './melcloud.mts'
import { TemperatureListener } from './temperature.mts'

// Listener for the outdoor temperature sensor. Owns the registry of
// MELCloudListener instances across all AC devices and coordinates
// them. Monitors the outdoor sensor lazily — only when at least one
// device enters cooling mode.
export class OutdoorTemperatureListener extends TemperatureListener {
  public get value(): number | null {
    return this.#value
  }

  readonly #capabilityId: string

  readonly #deviceListeners = new Map<string, MELCloudListener>()

  #value: number | null = null

  private constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
    capabilityId: string,
  ) {
    super(app, device)
    this.#capabilityId = capabilityId
  }

  // Validates the capability path ("deviceId:capabilityId"), persists
  // the settings, and starts listening to the MELCloud devices'
  // thermostat modes when enabled.
  public static async create(
    app: MELCloudExtensionApp,
    { capabilityPath, isEnabled }: TemperatureListenerData,
  ): Promise<OutdoorTemperatureListener> {
    const { capabilityId, device } = await this.#validateCapabilityPath(
      app,
      capabilityPath,
    )
    app.homey.settings.set('capabilityPath', capabilityPath)
    app.homey.settings.set('isEnabled', isEnabled)
    const listener = new this(app, device, capabilityId)
    if (isEnabled) {
      await listener.#listenToThermostatModes()
    }
    return listener
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

  static async #validateCapabilityPath(
    app: MELCloudExtensionApp,
    capabilityPath: string,
  ): Promise<{
    capabilityId: string
    device: HomeyAPIV3Local.ManagerDevices.Device
  }> {
    const [deviceId = '', capabilityId = ''] = capabilityPath.split(':')
    const device = await this.#getDevice(app, deviceId)
    if (device.capabilitiesObj?.[capabilityId] === undefined) {
      throw new ListenerError('error.notFound', {
        cause: { idOrName: capabilityId, type: app.names.outdoorTemperature },
      })
    }
    return { capabilityId, device }
  }

  public async destroy(): Promise<void> {
    await Promise.all(
      this.#deviceListeners
        .values()
        .map(async (listener) => listener.destroy()),
    )
    this.#deviceListeners.clear()
    this.releaseTemperatureListener()
  }

  // Starts monitoring the outdoor temperature sensor. On each change,
  // recalculates all MELCloud devices' target temperatures in parallel.
  // Called lazily: only when the first device enters cooling mode.
  public async listenToOutdoorTemperature(): Promise<void> {
    this.#value = Number(await this.getCapabilityValue(this.#capabilityId))
    if (this.temperatureListener !== null) {
      return
    }
    this.temperatureListener = this.device.makeCapabilityInstance(
      this.#capabilityId,
      async (value) => {
        this.#value = Number(value)
        this.app.pushToUI('listened', {
          capability: this.names.temperature,
          name: this.device.name,
          value: formatTemperature(value),
        })
        await Promise.all(
          this.#deviceListeners
            .values()
            .map(async (listener) => listener.setTargetTemperature()),
        )
      },
    )
    this.app.pushToUI('created', {
      capability: this.names.temperature,
      name: this.device.name,
    })
  }

  // Releases the outdoor sensor listener when no device other than the
  // excluded one is still in cooling mode (the excluded device is the
  // one that just left cooling — its mode listener may not reflect the
  // new value yet).
  public releaseWhenIdle(excludedDeviceId: string): void {
    if (
      this.#deviceListeners
        .entries()
        .every(
          ([deviceId, listener]) =>
            deviceId === excludedDeviceId || !listener.isCooling,
        )
    ) {
      this.releaseTemperatureListener()
    }
  }

  async #listenToThermostatModes(): Promise<void> {
    await Promise.all(
      this.app.melcloudDevices.map(async (device) => {
        const listener = new MELCloudListener(this.app, device, this)
        this.#deviceListeners.set(device.id, listener)
        return listener.listenToThermostatMode()
      }),
    )
  }
}
