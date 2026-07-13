import type { HomeyAPIV3Local } from 'homey-api'

import type MELCloudExtensionApp from '../app.mts'
import type { Names, Thresholds } from '../types.mts'
import { formatTemperature } from '../lib/format-temperature.mts'
import type { OutdoorSource } from './outdoor-source.mts'

const COOL = 'cool'
const TARGET_TEMPERATURE = 'target_temperature'
const THERMOSTAT_MODE = 'thermostat_mode'

const DEFAULT_TEMPERATURE = 0
// Minimum gap between outdoor temperature and target cooling temperature
const GAP_TEMPERATURE = 8
// Fallback ceiling when the capability options do not advertise a max
// (both MELCloud ATA drivers ship `target_temperature` with max 31 °C)
const MAX_TEMPERATURE = 31

// Manages a single MELCloud AC device: listens to thermostat mode
// changes and automatically adjusts the target cooling temperature
// based on its outdoor source readings.
export class MELCloudListener {
  public get isCooling(): boolean {
    return this.#thermostatModeListener?.value === COOL
  }

  readonly #app: MELCloudExtensionApp

  readonly #device: HomeyAPIV3Local.ManagerDevices.Device

  readonly #names: Names

  readonly #source: OutdoorSource

  #targetTemperatureListener: HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability | null =
    null

  #thermostatModeListener: HomeyAPIV3Local.ManagerDevices.Device.DeviceCapability | null =
    null

  public constructor(
    app: MELCloudExtensionApp,
    device: HomeyAPIV3Local.ManagerDevices.Device,
    source: OutdoorSource,
  ) {
    this.#app = app
    this.#device = device
    this.#names = app.names
    this.#source = source
  }

  public async destroy(): Promise<void> {
    await this.#destroyTemperature()
    this.#source.detach(this)
    if (this.#thermostatModeListener !== null) {
      this.#thermostatModeListener.destroy()
      this.#thermostatModeListener = null
    }
    this.#app.pushToUI('cleaned', {
      capability: this.#names.thermostatMode,
      name: this.#device.name,
    })
  }

  // Listens to thermostat mode changes: when switching to "cool",
  // starts monitoring target temperature; when leaving "cool",
  // stops monitoring and detaches from the outdoor source (which stops
  // watching once its last cooling device detaches).
  public async listenToThermostatMode(): Promise<void> {
    const currentThermostatMode =
      await this.#getCapabilityValue(THERMOSTAT_MODE)
    this.#thermostatModeListener = this.#device.makeCapabilityInstance(
      THERMOSTAT_MODE,
      async (value) => {
        this.#app.pushToUI('listened', {
          capability: this.#names.thermostatMode,
          name: this.#device.name,
          value,
        })
        if (value === COOL) {
          await this.#listenToTargetTemperature()
          return
        }
        await this.#destroyTemperature()
        this.#source.detach(this)
      },
    )
    this.#app.pushToUI('created', {
      capability: this.#names.thermostatMode,
      name: this.#device.name,
    })
    if (currentThermostatMode === COOL) {
      await this.#listenToTargetTemperature()
    }
  }

  public async setTargetTemperature(): Promise<void> {
    if (this.#targetTemperatureListener === null) {
      return
    }
    const value = this.#getTargetTemperature()
    await this.#targetTemperatureListener.setValue(value)
    this.#app.pushToUI('calculated', {
      name: this.#device.name,
      outdoorTemperature: formatTemperature(this.#source.value),
      threshold: formatTemperature(this.#getThreshold()),
      value: formatTemperature(value),
    })
  }

  async #destroyTemperature(): Promise<void> {
    if (this.#targetTemperatureListener === null) {
      return
    }
    this.#targetTemperatureListener.destroy()
    this.#targetTemperatureListener = null
    this.#app.pushToUI('cleaned', {
      capability: this.#names.temperature,
      name: this.#device.name,
    })
    await this.#revertTemperature()
  }

  async #getCapabilityValue(
    capabilityId: string,
  ): Promise<boolean | number | string | null> {
    return this.#app.api.devices.getCapabilityValue({
      capabilityId,
      deviceId: this.#device.id,
    })
  }

  #getMaxTemperature(): number {
    return (
      this.#device.capabilitiesObj?.[TARGET_TEMPERATURE]?.max ?? MAX_TEMPERATURE
    )
  }

  // Calculates the automatic cooling target:
  // - At least the user-defined threshold (minimum comfort temperature)
  // - At least outdoor temperature minus GAP_TEMPERATURE (efficiency floor)
  // - At most the device's advertised setpoint ceiling
  #getTargetTemperature(): number {
    return Math.min(
      Math.max(
        this.#getThreshold(),
        Math.ceil(this.#source.value ?? DEFAULT_TEMPERATURE) - GAP_TEMPERATURE,
      ),
      this.#getMaxTemperature(),
    )
  }

  #getThreshold(): number {
    return this.#getThresholds()[this.#device.id] ?? DEFAULT_TEMPERATURE
  }

  #getThresholds(): Thresholds {
    return this.#app.homey.settings.get('thresholds') ?? {}
  }

  // Starts monitoring target temperature for this AC device:
  // 1. Attaches to the outdoor source first (dependency)
  // 2. Captures current target temperature as the initial threshold
  // 3. Listens for manual changes: if the user sets a different value
  //    than what was auto-calculated, it becomes the new threshold
  // 4. Triggers an initial recalculation via #setThreshold
  async #listenToTargetTemperature(): Promise<void> {
    if (this.#targetTemperatureListener !== null) {
      return
    }
    await this.#source.attach(this)
    const temperature = Number(
      await this.#getCapabilityValue(TARGET_TEMPERATURE),
    )
    this.#targetTemperatureListener = this.#device.makeCapabilityInstance(
      TARGET_TEMPERATURE,
      async (value) => {
        if (value === this.#getTargetTemperature()) {
          return
        }
        this.#app.pushToUI('listened', {
          capability: this.#names.temperature,
          name: this.#device.name,
          value: formatTemperature(value),
        })
        await this.#setThreshold(Number(value))
      },
    )
    this.#app.pushToUI('created', {
      capability: this.#names.temperature,
      name: this.#device.name,
    })
    await this.#setThreshold(temperature)
  }

  // Restores the target temperature to the user's threshold when
  // auto-adjustment stops (e.g. device leaves cooling mode).
  async #revertTemperature(): Promise<void> {
    try {
      const value = this.#getThreshold()
      await this.#device.setCapabilityValue({
        capabilityId: TARGET_TEMPERATURE,
        value,
      })
      this.#app.pushToUI('reverted', {
        name: this.#device.name,
        value: formatTemperature(value),
      })
    } catch {
      this.#app.pushToUI('error.notFound', {
        idOrName: this.#device.name,
        type: this.#names.device,
      })
    }
  }

  async #setThreshold(value: number): Promise<void> {
    const { id, name } = this.#device
    const thresholds = this.#getThresholds()
    thresholds[id] = value
    this.#app.homey.settings.set('thresholds', thresholds)
    this.#app.pushToUI('saved', { name, value: formatTemperature(value) })
    await this.setTargetTemperature()
  }
}
