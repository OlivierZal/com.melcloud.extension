import type { HomeyAPIV3Local } from 'homey-api'
import { fireAndForget } from '@olivierzal/homey-kit'

import type MELCloudExtensionApp from '../app.mts'
import { formatTemperature } from '../lib/format-temperature.mts'
import { toTemperature } from '../lib/to-temperature.mts'
import {
  type Names,
  COOL,
  TARGET_TEMPERATURE,
  THERMOSTAT_MODE,
} from '../types.mts'
import type { OutdoorSource } from './outdoor-source.mts'

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
    // The debt follows the WRITE, never the intent: only a value that
    // actually reached the device is owed back.
    this.#app.recordWrite(this.#device.id, value)
    this.#app.pushToUI('calculated', {
      name: this.#device.name,
      outdoorTemperature: formatTemperature(this.#source.value),
      threshold: formatTemperature(this.#getThreshold()),
      value: formatTemperature(value),
    })
  }

  // A setpoint still holding this app's own last write is not a user
  // choice, so it must not become the comfort value: what the device
  // held before that write is the one the ledger remembers. This is the
  // path a crash-restart takes, with the auto-calculated value still on
  // the unit.
  #comfortTemperature(found: number): number {
    const adjustment = this.#app.adjustments[this.#device.id]
    return adjustment?.written === found ? adjustment.previous : found
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
    // The fast path only: the app settles the same debt again on its
    // next reconciliation, so a listener that never runs this — killed
    // by a crash, deaf to the mode change — costs latency, not the
    // setpoint.
    await this.#app.revertAdjustment(this.#device)
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

  // The comfort setpoint IS the value this app owes the device back, so
  // the ledger is its one home: a second store for the same number could
  // only drift from it. `null` means absent, never a stand-in — callers
  // decide what to do without one.
  #getThreshold(): number | null {
    return this.#app.adjustments[this.#device.id]?.previous ?? null
  }

  // The current target temperature seeds the user threshold; a manual
  // change away from the auto-calculated value becomes the new threshold.
  async #listenToTargetTemperature(): Promise<void> {
    if (this.#targetTemperatureListener !== null) {
      return
    }
    await this.#source.attach(this)
    const temperature = toTemperature(
      await this.#getCapabilityValue(TARGET_TEMPERATURE),
    )
    // A setpoint this app cannot read is one it cannot give back, so the
    // device is left alone rather than adjusted into a debt that could
    // never be repaid.
    if (temperature === null) {
      this.#refuseUnreadableSetpoint()
      return
    }
    this.#targetTemperatureListener = this.#device.makeCapabilityInstance(
      TARGET_TEMPERATURE,
      (value) => {
        const manual = toTemperature(value)
        if (manual === null || manual === this.#getTargetTemperature()) {
          return
        }
        this.#app.pushToUI('listened', {
          capability: this.#names.temperature,
          name: this.#device.name,
          value: formatTemperature(manual),
        })
        fireAndForget(
          this.#setThreshold(manual),
          this.#app,
          'Failed to set the temperature threshold',
        )
      },
    )
    this.#app.pushToUI('created', {
      capability: this.#names.temperature,
      name: this.#device.name,
    })
    await this.#setThreshold(this.#comfortTemperature(temperature))
  }

  // Leaving the source too: an unadjusted device must not hold a watcher
  // open on its behalf.
  #refuseUnreadableSetpoint(): void {
    this.#app.pushToUI('error.noThreshold', { name: this.#device.name })
    this.#source.detach(this)
  }

  async #setThreshold(value: number): Promise<void> {
    const { id, name } = this.#device
    this.#app.recordComfort(id, value)
    this.#app.pushToUI('saved', { name, value: formatTemperature(value) })
    await this.setTargetTemperature()
  }
}
