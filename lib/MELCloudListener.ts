/* eslint-disable
  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
*/
import { DEFAULT_0, type DeviceCapability, type Thresholds } from '../types'
import BaseTemperatureListener from './BaseTemperatureListener'
import type { HomeyAPIV3Local } from 'homey-api'
import type MELCloudExtensionApp from '../app'
import OutdoorTemperatureListener from './OutdoorTemperatureListener'

const MAX_TEMPERATURE = 38
const MAX_TEMPERATURE_GAP = 8

export default class MELCloudListener extends BaseTemperatureListener {
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
        this.app.pushToUI('listener.listened', {
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
    this.app.pushToUI('listener.created', {
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
      await this.temperatureListener.setValue(value)
      this.app.pushToUI('target_temperature.calculated', {
        name: this.device.name,
        outdoorTemperature: `${OutdoorTemperatureListener.value}\u00A0°C`,
        threshold: `${this.#getThreshold()}\u00A0°C`,
        value: `${value}\u00A0°C`,
      })
    }
  }

  protected async destroyTemperature(): Promise<void> {
    if (this.temperatureListener !== null) {
      super.destroyTemperature()
      await this.#revertTemperature()
    }
  }

  async #destroy(): Promise<void> {
    await this.destroyTemperature()
    if (this.#thermostatModeListener !== null) {
      this.#thermostatModeListener.destroy()
    }
    this.app.pushToUI('listener.cleaned', {
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
            this.app.pushToUI('listener.listened', {
              capability: this.names.temperature,
              name: this.device.name,
              value: `${value}\u00A0°C`,
            })
            if (typeof value === 'number') {
              await this.#setThreshold(value)
            }
          }
        },
      )
      this.app.pushToUI('listener.created', {
        capability: this.names.temperature,
        name: this.device.name,
      })
    }
  }

  async #revertTemperature(): Promise<void> {
    const value = this.#getThreshold()
    await this.device.setCapabilityValue({
      capabilityId: 'target_temperature',
      value,
    })
    this.app.pushToUI('target_temperature.reverted', {
      name: this.device.name,
      value: `${value}\u00A0°C`,
    })
  }

  async #setThreshold(value: number): Promise<void> {
    const thresholds = this.#getThresholds()
    thresholds[this.device.id] = value
    this.app.setHomeySettings({ thresholds })
    this.app.pushToUI('target_temperature.saved', {
      name: this.device.name,
      value: `${value}\u00A0°C`,
    })
    await this.setTargetTemperature()
  }
}
