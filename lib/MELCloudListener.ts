/* eslint-disable
  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
*/
import {
  type CapabilityValue,
  DEFAULT_0,
  type DeviceCapability,
  type Thresholds,
} from '../types'
import BaseTemperatureListener from './BaseTemperatureListener'
import type { HomeyAPIV3Local } from 'homey-api'
import ListenerEvent from './ListenerEvent'
import type MELCloudExtensionApp from '../app'

const MAX_TEMPERATURE = 38
const MAX_TEMPERATURE_GAP = 8

export default class MELCloudListener extends BaseTemperatureListener {
  public static readonly listeners: Map<string, MELCloudListener> = new Map<
    string,
    MELCloudListener
  >()

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

  public async destroy(): Promise<void> {
    await super.destroy()
    if (this.temperatureListener !== null) {
      await this.#revertTemperature()
    }
  }

  public async hardDestroy(): Promise<void> {
    await this.destroy()
    if (this.#thermostatModeListener !== null) {
      this.#thermostatModeListener.destroy()
    }
    this.app.log(
      new ListenerEvent(this.app.homey, 'listener.cleaned', {
        capability: this.app.names.thermostatMode,
        name: this.device.name,
      }),
    )
    MELCloudListener.listeners.delete(this.device.id)
  }

  public async listenToThermostatMode(): Promise<void> {
    const currentThermostatMode: string = (await this.getCapabilityValue(
      'thermostat_mode',
    )) as string
    this.#thermostatModeListener = this.device.makeCapabilityInstance(
      'thermostat_mode',
      async (value: CapabilityValue): Promise<void> => {
        this.app.log(
          new ListenerEvent(this.app.homey, 'listener.listened', {
            capability: this.app.names.thermostatMode,
            name: this.device.name,
            value,
          }),
        )
        if (value === 'cool') {
          await this.#listenToTargetTemperature()
        } else {
          await this.destroy()
          if (
            (await this.#getOtherThermostatModes()).every(
              (mode: string) => mode !== 'cool',
            ) &&
            this.app.outdoorTemperatureListener
          ) {
            await this.app.outdoorTemperatureListener.destroy()
          }
        }
      },
    )
    this.app.log(
      new ListenerEvent(this.app.homey, 'listener.created', {
        capability: this.app.names.thermostatMode,
        name: this.device.name,
      }),
    )
    if (currentThermostatMode === 'cool') {
      await this.#listenToTargetTemperature()
    }
  }

  public async setTargetTemperature(): Promise<void> {
    if (this.temperatureListener === null) {
      return
    }
    const value: number = this.#getTargetTemperature()
    await this.temperatureListener.setValue(value)
    this.app.log(
      new ListenerEvent(this.app.homey, 'target_temperature.calculated', {
        name: this.device.name,
        outdoorTemperature: `${this.app.outdoorTemperatureListener?.value}\u00A0°C`,
        threshold: `${this.#getThreshold(this.device.id)}\u00A0°C`,
        value: `${value}\u00A0°C`,
      }),
    )
  }

  async #getOtherThermostatModes(): Promise<string[]> {
    return Promise.all(
      Array.from(MELCloudListener.listeners.values())
        .filter(({ device: { id } }) => id !== this.device.id)
        .map(
          async (): Promise<string> =>
            (await this.getCapabilityValue('thermostat_mode')) as string,
        ),
    )
  }

  #getTargetTemperature(): number {
    return Math.min(
      Math.max(
        this.#getThreshold(this.device.id),
        Math.ceil(this.app.outdoorTemperatureListener?.value ?? DEFAULT_0) -
          MAX_TEMPERATURE_GAP,
      ),
      MAX_TEMPERATURE,
    )
  }

  #getThreshold(deviceId: string): number {
    return this.app.getHomeySetting('thresholds')?.[deviceId] ?? DEFAULT_0
  }

  async #listenToTargetTemperature(): Promise<void> {
    if (
      this.temperatureListener !== null ||
      !this.app.outdoorTemperatureListener
    ) {
      return
    }
    await this.app.outdoorTemperatureListener.listenToOutdoorTemperature()
    const currentTargetTemperature: number = (await this.getCapabilityValue(
      'target_temperature',
    )) as number
    this.temperatureListener = this.device.makeCapabilityInstance(
      'target_temperature',
      async (value: CapabilityValue): Promise<void> => {
        if (value === this.#getTargetTemperature()) {
          return
        }
        this.app.log(
          new ListenerEvent(this.app.homey, 'listener.listened', {
            capability: this.app.names.temperature,
            name: this.device.name,
            value: `${value as number}\u00A0°C`,
          }),
        )
        await this.#setThreshold(value as number)
      },
    )
    this.app.log(
      new ListenerEvent(this.app.homey, 'listener.created', {
        capability: this.app.names.temperature,
        name: this.device.name,
      }),
    )
    await this.#setThreshold(currentTargetTemperature)
  }

  async #revertTemperature(): Promise<void> {
    const value: number = this.#getThreshold(this.device.id)
    await this.device.setCapabilityValue({
      capabilityId: 'target_temperature',
      value,
    })
    this.app.log(
      new ListenerEvent(this.app.homey, 'target_temperature.reverted', {
        name: this.device.name,
        value: `${value}\u00A0°C`,
      }),
    )
  }

  async #setThreshold(value: number): Promise<void> {
    const thresholds: Thresholds = this.app.getHomeySetting('thresholds') ?? {}
    thresholds[this.device.id] = value
    this.app.setHomeySettings({ thresholds })
    this.app.log(
      new ListenerEvent(this.app.homey, 'target_temperature.saved', {
        name: this.device.name,
        value: `${value}\u00A0°C`,
      }),
    )
    await this.setTargetTemperature()
  }
}
