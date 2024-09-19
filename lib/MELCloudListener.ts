import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '..'
import type { DeviceCapability, Thresholds } from '../types'

import OutdoorTemperatureListener from './OutdoorTemperatureListener'
import TemperatureListener from './TemperatureListener'

const COOL = 'cool'
const TARGET_TEMPERATURE = 'target_temperature'
const THERMOSTAT_MODE = 'thermostat_mode'

const DEFAULT_TEMPERATURE = 0
const GAP_TEMPERATURE = 8
const MAX_TEMPERATURE = 38

export default class MELCloudListener extends TemperatureListener {
  public static readonly listeners = new Map<string, MELCloudListener>()

  #thermostatModeListener: DeviceCapability = null

  public constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
  ) {
    super(app, device)
    if (!MELCloudListener.listeners.has(device.id)) {
      MELCloudListener.listeners.set(device.id, this)
    }
  }

  public static async destroy(): Promise<void> {
    await Promise.all(
      [...this.listeners.values()].map(async (listener) => listener.#destroy()),
    )
  }

  public async listenToThermostatMode(): Promise<void> {
    const currentThermostatMode = await this.getCapabilityValue(THERMOSTAT_MODE)
    this.#thermostatModeListener = this.device.makeCapabilityInstance(
      THERMOSTAT_MODE,
      async (value) => {
        this.app.pushToUI('listened', {
          capability: this.names.thermostatMode,
          name: this.device.name,
          value,
        })
        if (value === COOL) {
          await this.#listenToTargetTemperature()
          return
        }
        await this.destroyTemperature()
        if (
          !this.#isItCoolingElsewhere() &&
          OutdoorTemperatureListener.temperatureListener !== null
        ) {
          await OutdoorTemperatureListener.destroyTemperature()
        }
      },
    )
    this.app.pushToUI('created', {
      capability: this.names.thermostatMode,
      name: this.device.name,
    })
    if (currentThermostatMode === COOL) {
      await this.#listenToTargetTemperature()
    }
  }

  public async setTargetTemperature(): Promise<void> {
    if (this.temperatureListener !== null) {
      const value = this.#getTargetTemperature()
      const outdoorTemperature = OutdoorTemperatureListener.value
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await this.temperatureListener.setValue(value)
      this.app.pushToUI('calculated', {
        name: this.device.name,
        outdoorTemperature: `${String(outdoorTemperature)}\u00A0°C`,
        threshold: `${String(this.#getThreshold())}\u00A0°C`,
        value: `${String(value)}\u00A0°C`,
      })
    }
  }

  protected override async destroyTemperature(): Promise<void> {
    if (this.temperatureListener !== null) {
      await super.destroyTemperature()
      await this.#revertTemperature()
    }
  }

  async #destroy(): Promise<void> {
    await this.destroyTemperature()
    if (this.#thermostatModeListener !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this.#thermostatModeListener.destroy()
    }
    this.app.pushToUI('cleaned', {
      capability: this.names.thermostatMode,
      name: this.device.name,
    })
    MELCloudListener.listeners.delete(this.device.id)
  }

  #getTargetTemperature(): number {
    return Math.min(
      Math.max(
        this.#getThreshold(),
        Math.ceil(OutdoorTemperatureListener.value ?? DEFAULT_TEMPERATURE) -
          GAP_TEMPERATURE,
      ),
      MAX_TEMPERATURE,
    )
  }

  #getThreshold(): number {
    return this.#getThresholds()[this.device.id] ?? DEFAULT_TEMPERATURE
  }

  #getThresholds(): Thresholds {
    return this.app.getHomeySetting('thresholds') ?? {}
  }

  #isItCoolingElsewhere(): boolean {
    return [...MELCloudListener.listeners.values()].some(
      (listener) =>
        (listener.device.id !== this.device.id &&
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          listener.#thermostatModeListener.value) === COOL,
    )
  }

  async #listenToTargetTemperature(): Promise<void> {
    if (this.temperatureListener === null) {
      await OutdoorTemperatureListener.listenToOutdoorTemperature()
      const temperature = (await this.getCapabilityValue(
        TARGET_TEMPERATURE,
      )) as number
      this.temperatureListener = this.device.makeCapabilityInstance(
        TARGET_TEMPERATURE,
        async (value) => {
          if (value !== this.#getTargetTemperature()) {
            this.app.pushToUI('listened', {
              capability: this.names.temperature,
              name: this.device.name,
              value: `${String(value)}\u00A0°C`,
            })
            await this.#setThreshold(value as number)
          }
        },
      )
      this.app.pushToUI('created', {
        capability: this.names.temperature,
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
    } catch (_error) {
      this.app.pushToUI('error.not_found', {
        idOrName: this.device.name,
        type: this.names.device,
      })
    }
  }

  async #setThreshold(value: number): Promise<void> {
    const { id, name } = this.device
    const thresholds = this.#getThresholds()
    thresholds[id] = value
    this.app.setHomeySettings({ thresholds })
    this.app.pushToUI('saved', { name, value: `${String(value)}\u00A0°C` })
    await this.setTargetTemperature()
  }
}
