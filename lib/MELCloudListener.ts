import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '..'

import { type DeviceCapability, type Thresholds, DEFAULT_0 } from '../types'
import OutdoorTemperatureListener from './OutdoorTemperatureListener'
import TemperatureListener from './TemperatureListener'

const MAX_TEMPERATURE = 38
const MAX_TEMPERATURE_GAP = 8

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
      Array.from(this.listeners.values()).map(async (listener) => {
        await listener.#destroy()
      }),
    )
  }

  public async listenToThermostatMode(): Promise<void> {
    const currentThermostatMode =
      await this.getCapabilityValue('thermostat_mode')
    this.#thermostatModeListener = this.device.makeCapabilityInstance(
      'thermostat_mode',
      async (value) => {
        this.app.pushToUI('listened', {
          capability: this.names.thermostatMode,
          name: this.device.name,
          value,
        })
        if (value === 'cool') {
          await this.#listenToTargetTemperature()
          return
        }
        await this.destroyTemperature()
        if (
          !this.#isItCoolingElsewhere() &&
          OutdoorTemperatureListener.temperatureListener !== null
        ) {
          OutdoorTemperatureListener.destroyTemperature()
        }
      },
    )
    this.app.pushToUI('created', {
      capability: this.names.thermostatMode,
      name: this.device.name,
    })
    if (currentThermostatMode === 'cool') {
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
      super.destroyTemperature()
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
        Math.ceil(OutdoorTemperatureListener.value ?? DEFAULT_0) -
          MAX_TEMPERATURE_GAP,
      ),
      MAX_TEMPERATURE,
    )
  }

  #getThreshold(): number {
    return this.#getThresholds()[this.device.id] ?? DEFAULT_0
  }

  #getThresholds(): Thresholds {
    return this.app.getHomeySetting('thresholds') ?? {}
  }

  #isItCoolingElsewhere(): boolean {
    return Array.from(MELCloudListener.listeners.values()).some(
      (listener) =>
        (listener.device.id !== this.device.id &&
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          listener.#thermostatModeListener.value) === 'cool',
    )
  }

  async #listenToTargetTemperature(): Promise<void> {
    if (this.temperatureListener === null) {
      await OutdoorTemperatureListener.listenToOutdoorTemperature()
      const currentTargetTemperature =
        await this.getCapabilityValue('target_temperature')
      if (typeof currentTargetTemperature === 'number') {
        await this.#setThreshold(currentTargetTemperature)
      }
      this.temperatureListener = this.device.makeCapabilityInstance(
        'target_temperature',
        async (value) => {
          if (value !== this.#getTargetTemperature()) {
            this.app.pushToUI('listened', {
              capability: this.names.temperature,
              name: this.device.name,
              value: `${String(value)}\u00A0°C`,
            })
            if (typeof value === 'number') {
              await this.#setThreshold(value)
            }
          }
        },
      )
      this.app.pushToUI('created', {
        capability: this.names.temperature,
        name: this.device.name,
      })
    }
  }

  async #revertTemperature(): Promise<void> {
    try {
      const value = this.#getThreshold()
      await this.device.setCapabilityValue({
        capabilityId: 'target_temperature',
        value,
      })
      this.app.pushToUI('reverted', {
        name: this.device.name,
        value: `${String(value)}\u00A0°C`,
      })
    } catch (_error) {
      this.app.pushToUI('error.not_found', {
        id: this.device.id,
        name: this.device.name,
      })
    }
  }

  async #setThreshold(value: number): Promise<void> {
    const thresholds = this.#getThresholds()
    thresholds[this.device.id] = value
    this.app.setHomeySettings({ thresholds })
    this.app.pushToUI('saved', {
      name: this.device.name,
      value: `${String(value)}\u00A0°C`,
    })
    await this.setTargetTemperature()
  }
}
