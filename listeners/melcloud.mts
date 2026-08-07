import type { HomeyAPIV3Local } from 'homey-api'
import { fireAndForget } from '@olivierzal/homey-kit'

import type MELCloudExtensionApp from '../app.mts'
import type { Names, Thresholds } from '../types.mts'
import { formatTemperature } from '../lib/format-temperature.mts'
import type { OutdoorSource } from './outdoor-source.mts'

const COOL = 'cool'
const TARGET_TEMPERATURE = 'target_temperature'
const THERMOSTAT_MODE = 'thermostat_mode'

// Minimum gap between outdoor temperature and target cooling temperature
const GAP_TEMPERATURE = 8

// MELCloud accepts half-degree setpoints: ceiling to the next 0.5 °C
// keeps the floor as close as the wire allows to the real outdoor
// reading, still never letting the setpoint sit more than
// GAP_TEMPERATURE below it.
const SETPOINT_STEP = 0.5

const ceilToSetpointStep = (value: number): number =>
  Math.ceil(value / SETPOINT_STEP) * SETPOINT_STEP
// Fallback ceiling when the capability options do not advertise a max
// (both MELCloud ATA drivers ship `target_temperature` with max 31 °C)
const MAX_TEMPERATURE = 31

// Manages a single MELCloud AC device: listens to thermostat mode
// changes and automatically adjusts the target cooling temperature
// based on its outdoor source readings.
export class MELCloudListener {
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
    // homey-api invokes capability listeners bare: route the async
    // bodies through fireAndForget so a failure (e.g. the device going
    // offline mid-update) logs instead of crashing the app with an
    // unhandled rejection.
    this.#thermostatModeListener = this.#device.makeCapabilityInstance(
      THERMOSTAT_MODE,
      (value) => {
        fireAndForget(
          (async (): Promise<void> => {
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
          })(),
          this.#app,
          'Failed to handle a thermostat mode change',
        )
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
    if (value === null) {
      this.#app.pushToUI('error.noThreshold', { name: this.#device.name })
      return
    }
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
  //
  // Each floor is a term only when it is known: no outdoor reading means
  // no efficiency floor, not a floor computed from a stand-in number.
  #getTargetTemperature(): number | null {
    const outdoor = this.#source.value
    const floors = [
      this.#getThreshold(),
      outdoor === null ? null : ceilToSetpointStep(outdoor) - GAP_TEMPERATURE,
    ].filter((floor): floor is number => floor !== null)
    // Neither a stored setpoint nor a reading: nothing constrains the
    // target, so there is no target to compute. Math.max of nothing is
    // -Infinity, which would be a worse invention than the 0 this
    // replaces.
    return floors.length === 0
      ? null
      : Math.min(Math.max(...floors), this.#getMaxTemperature())
  }

  // `null` when the user has no stored comfort setpoint for this device:
  // absent, never a stand-in value. Callers decide what to do without
  // one — the revert path refuses to write rather than inventing a
  // setpoint nobody chose.
  #getThreshold(): number | null {
    return this.#getThresholds()[this.#device.id] ?? null
  }

  #getThresholds(): Thresholds {
    return this.#app.thresholds
  }

  // The current target temperature seeds the user threshold; a manual
  // change away from the auto-calculated value becomes the new threshold.
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
      (value) => {
        if (value === this.#getTargetTemperature()) {
          return
        }
        this.#app.pushToUI('listened', {
          capability: this.#names.temperature,
          name: this.#device.name,
          value: formatTemperature(value),
        })
        fireAndForget(
          this.#setThreshold(Number(value)),
          this.#app,
          'Failed to set the temperature threshold',
        )
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
  //
  // Without a stored threshold there is nothing to restore, so nothing
  // is written: leaving the unit where it is beats commanding a setpoint
  // the user never chose. This path used to send the 0 °C that stood in
  // for "absent".
  async #revertTemperature(): Promise<void> {
    const value = this.#getThreshold()
    if (value === null) {
      this.#app.pushToUI('error.noThreshold', { name: this.#device.name })
      return
    }
    try {
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
    this.#app.thresholds = { ...this.#app.thresholds, [id]: value }
    this.#app.pushToUI('saved', { name, value: formatTemperature(value) })
    await this.setTargetTemperature()
  }
}
