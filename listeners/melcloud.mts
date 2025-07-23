import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'
import type { Thresholds } from '../types.mts'

import type { OutdoorTemperatureListener } from './outdoor-temperature.mts'

import { TemperatureListener } from './temperature.mts'

const COOL = 'cool'
const TARGET_TEMPERATURE = 'target_temperature'
const THERMOSTAT_MODE = 'thermostat_mode'

const GAP_TEMPERATURE = 8
const MAX_TEMPERATURE = 38

export class MELCloudListener extends TemperatureListener {
  public static readonly listeners = new Map<string, MELCloudListener>()

  static #outdoorTemperatureListener: typeof OutdoorTemperatureListener

  #thermostatModeListener: HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability | null =
    null

  public constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
  ) {
    super(app, device)
    MELCloudListener.listeners.set(device.id, this)
  }

  protected override async destroyTemperature(): Promise<void> {
    if (this.temperatureListener !== null) {
      await super.destroyTemperature()
      await this.#revertTemperature()
    }
  }

  public static async destroy(): Promise<void> {
    await Promise.all(
      [...this.listeners.values()].map(async (listener) => listener.#destroy()),
    )
  }

  public static setOutdoorTemperatureListener(
    listener: typeof OutdoorTemperatureListener,
  ): void {
    this.#outdoorTemperatureListener = listener
  }

  public async listenToThermostatMode(): Promise<void> {
    const currentThermostatMode = await this.getCapabilityValue(THERMOSTAT_MODE)
    this.#thermostatModeListener = this.device.makeCapabilityInstance(
      THERMOSTAT_MODE,
      async (value) => {
        this.app.pushToUI('listened', {
          capability: this.names['thermostatMode'],
          name: this.device.name,
          value,
        })
        if (value === COOL) {
          await this.#listenToTargetTemperature()
          return
        }
        await this.destroyTemperature()
        const outdoorTemperatureListener =
          MELCloudListener.#outdoorTemperatureListener
        if (
          !this.#isItCoolingElsewhere() &&
          outdoorTemperatureListener.temperatureListener !== null
        ) {
          await outdoorTemperatureListener.destroyTemperature()
        }
      },
    )
    this.app.pushToUI('created', {
      capability: this.names['thermostatMode'],
      name: this.device.name,
    })
    if (currentThermostatMode === COOL) {
      await this.#listenToTargetTemperature()
    }
  }

  public async setTargetTemperature(): Promise<void> {
    if (this.temperatureListener !== null) {
      const value = this.#getTargetTemperature()
      const { value: outdoorTemperature } =
        MELCloudListener.#outdoorTemperatureListener
      await this.temperatureListener.setValue(value)
      this.app.pushToUI('calculated', {
        name: this.device.name,
        outdoorTemperature: `${String(outdoorTemperature)}\u00A0°C`,
        threshold: `${String(this.#getThreshold())}\u00A0°C`,
        value: `${String(value)}\u00A0°C`,
      })
    }
  }

  async #destroy(): Promise<void> {
    await this.destroyTemperature()
    if (this.#thermostatModeListener !== null) {
      this.#thermostatModeListener.destroy()
    }
    this.app.pushToUI('cleaned', {
      capability: this.names['thermostatMode'],
      name: this.device.name,
    })
    MELCloudListener.listeners.delete(this.device.id)
  }

  #getTargetTemperature(): number {
    return Math.min(
      Math.max(
        this.#getThreshold(),
        Math.ceil(MELCloudListener.#outdoorTemperatureListener.value ?? 0) -
          GAP_TEMPERATURE,
      ),
      MAX_TEMPERATURE,
    )
  }

  #getThreshold(): number {
    return this.#getThresholds()[this.device.id] ?? 0
  }

  #getThresholds(): Thresholds {
    return this.app.homey.settings.get('thresholds') ?? {}
  }

  #isItCoolingElsewhere(): boolean {
    return [...MELCloudListener.listeners.values()].some(
      (listener) =>
        listener.device.id !== this.device.id &&
        listener.#thermostatModeListener?.value === COOL,
    )
  }

  async #listenToTargetTemperature(): Promise<void> {
    if (this.temperatureListener === null) {
      await MELCloudListener.#outdoorTemperatureListener.listenToOutdoorTemperature()
      const temperature = Number(
        await this.getCapabilityValue(TARGET_TEMPERATURE),
      )
      this.temperatureListener = this.device.makeCapabilityInstance(
        TARGET_TEMPERATURE,
        async (value) => {
          if (value !== this.#getTargetTemperature()) {
            this.app.pushToUI('listened', {
              capability: this.names['temperature'],
              name: this.device.name,
              value: `${String(value)}\u00A0°C`,
            })
            await this.#setThreshold(Number(value))
          }
        },
      )
      this.app.pushToUI('created', {
        capability: this.names['temperature'],
        name: this.device.name,
      })
      await this.#setThreshold(temperature)
    }
  }

  async #revertTemperature(): Promise<void> {
    try {
      const value = this.#getThreshold()
      await this.device.setCapabilityValue({
        capabilityId: TARGET_TEMPERATURE,
        value,
      })
      this.app.pushToUI('reverted', {
        name: this.device.name,
        value: `${String(value)}\u00A0°C`,
      })
    } catch {
      this.app.pushToUI('error.notFound', {
        idOrName: this.device.name,
        type: this.names['device'],
      })
    }
  }

  async #setThreshold(value: number): Promise<void> {
    const {
      app,
      device: { id, name },
    } = this
    const thresholds = this.#getThresholds()
    thresholds[id] = value
    app.homey.settings.set('thresholds', thresholds)
    app.pushToUI('saved', { name, value: `${String(value)}\u00A0°C` })
    await this.setTargetTemperature()
  }
}
