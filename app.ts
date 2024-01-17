/* eslint-disable
  @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-member-access
*/
import 'source-map-support/register'
import { App } from 'homey' // eslint-disable-line import/no-extraneous-dependencies
import { HomeyAPIV3Local } from 'homey-api'
import Event from './lib/Event'
import EventError from './lib/EventError'
import type {
  CapabilityValue,
  DeviceCapability,
  HomeySettings,
  MELCloudListener,
  TemperatureListener,
  TemperatureListenerData,
  Thresholds,
  ValueOf,
} from './types'

const MAX_TEMPERATURE = 38
const MAX_TEMPERATURE_GAP = 8
const SECOND = 1000 // ms

class MELCloudExtensionApp extends App {
  public melCloudDevices: HomeyAPIV3Local.ManagerDevices.Device[] = []

  public temperatureSensors: HomeyAPIV3Local.ManagerDevices.Device[] = []

  readonly #names: Record<string, string> = Object.fromEntries(
    ['device', 'outdoorTemperature', 'temperature', 'thermostatMode'].map(
      (name: string): [string, string] => [
        name,
        this.homey.__(`names.${name}`),
      ],
    ),
  )

  #melCloudListeners: Record<string, MELCloudListener> = {}

  #api!: HomeyAPIV3Local

  #initTimeout!: NodeJS.Timeout

  readonly #outdoorTemperature: {
    capabilityId: string
    value: number
    listener?: TemperatureListener
  } = { capabilityId: '', value: 0 }

  public async onInit(): Promise<void> {
    this.#api = (await HomeyAPIV3Local.createAppAPI({
      homey: this.homey,
    })) as HomeyAPIV3Local
    // @ts-expect-error: `homey-api` is partially typed
    await this.#api.devices.connect()
    this.init()
    // @ts-expect-error: `homey-api` is partially typed
    this.#api.devices.on('device.create', (): void => {
      this.init()
    })
    // @ts-expect-error: `homey-api` is partially typed
    this.#api.devices.on('device.delete', (): void => {
      this.init()
    })
    this.homey.on('unload', (): void => {
      this.cleanListeners().catch((error: Error): void => {
        this.error(error.message)
      })
    })
  }

  public async autoAdjustCooling(
    { capabilityPath, enabled }: TemperatureListenerData = {
      capabilityPath: this.getHomeySetting('capabilityPath') ?? '',
      enabled: this.getHomeySetting('enabled') ?? false,
    },
  ): Promise<void> {
    await this.cleanListeners()
    if (!capabilityPath) {
      if (enabled) {
        throw new EventError(this.homey, 'error.missing')
      }
      this.setHomeySettings({ capabilityPath, enabled })
      return
    }
    await this.handleTemperatureListenerData({ capabilityPath, enabled })
    if (enabled) {
      await this.listenToThermostatModes()
    }
  }

  public async onUninit(): Promise<void> {
    await this.cleanListeners()
  }

  private init(): void {
    this.homey.clearTimeout(this.#initTimeout)
    this.#initTimeout = this.homey.setTimeout(async (): Promise<void> => {
      try {
        await this.loadDevices()
        await this.autoAdjustCooling()
      } catch (error: unknown) {
        this.error(this.getErrorMessage(error))
      }
    }, SECOND)
  }

  private async loadDevices(): Promise<void> {
    this.melCloudDevices = []
    this.temperatureSensors = []
    const devices: HomeyAPIV3Local.ManagerDevices.Device[] =
      // @ts-expect-error: `homey-api` is partially typed
      (await this.#api.devices.getDevices()) as HomeyAPIV3Local.ManagerDevices.Device[]
    Object.values(devices).forEach(
      (device: HomeyAPIV3Local.ManagerDevices.Device) => {
        // @ts-expect-error: `homey-api` is partially typed
        if (device.driverId === 'homey:app:com.mecloud:melcloud') {
          this.melCloudDevices.push(device)
        } else if (
          // @ts-expect-error: `homey-api` is partially typed
          (device.capabilities as string[]).some((capability: string) =>
            capability.startsWith('measure_temperature'),
          )
        )
          this.temperatureSensors.push(device)
      },
    )
  }

  private async handleTemperatureListenerData({
    capabilityPath,
    enabled,
  }: TemperatureListenerData): Promise<void> {
    try {
      const [device, capabilityId]: [
        HomeyAPIV3Local.ManagerDevices.Device,
        string,
      ] = await this.validateCapabilityPath(capabilityPath)
      this.setHomeySettings({ capabilityPath, enabled })
      if (!this.#outdoorTemperature.listener) {
        this.#outdoorTemperature.listener = { device }
      } else if (device.id !== this.#outdoorTemperature.listener.device.id) {
        this.#outdoorTemperature.listener.device = device
      }
      this.#outdoorTemperature.capabilityId = capabilityId
    } catch (error: unknown) {
      if (error instanceof EventError) {
        throw new EventError(this.homey, error.name, error.params)
      }
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }

  private async validateCapabilityPath(
    capabilityPath: string,
  ): Promise<[HomeyAPIV3Local.ManagerDevices.Device, string]> {
    const [deviceId, capabilityId]: string[] = capabilityPath.split(':')
    let device: HomeyAPIV3Local.ManagerDevices.Device | null = null
    try {
      // @ts-expect-error: `homey-api` is partially typed
      device = (await this.#api.devices.getDevice({
        id: deviceId,
      })) as HomeyAPIV3Local.ManagerDevices.Device | null
    } catch (error: unknown) {
      throw new EventError(this.homey, 'error.not_found', {
        name: this.#names.device,
        id: deviceId,
      })
    }
    // @ts-expect-error: `homey-api` is partially typed
    if (!device || !(capabilityId in (device.capabilitiesObj ?? {}))) {
      throw new EventError(this.homey, 'error.not_found', {
        name: this.#names.outdoorTemperature,
        id: capabilityId,
      })
    }
    return [device, capabilityId]
  }

  private async listenToThermostatModes(): Promise<void> {
    this.#melCloudListeners = Object.fromEntries(
      this.melCloudDevices.map(
        (
          device: HomeyAPIV3Local.ManagerDevices.Device,
        ): [string, { device: HomeyAPIV3Local.ManagerDevices.Device }] => [
          device.id,
          { device },
        ],
      ),
    )
    const capability: string = this.#names.thermostatMode
    const capabilityId = 'thermostat_mode'
    await Promise.all(
      Object.values(this.#melCloudListeners).map(
        async (listener: MELCloudListener): Promise<void> => {
          const { device } = listener
          const deviceId: string = device.id
          const { name } = device
          const currentThermostatMode: string =
            // @ts-expect-error: `homey-api` is partially typed
            (await this.#api.devices.getCapabilityValue({
              deviceId,
              capabilityId,
            })) as string
          this.#melCloudListeners[deviceId].thermostatMode =
            device.makeCapabilityInstance(
              capabilityId,
              async (value: CapabilityValue): Promise<void> => {
                this.log(
                  new Event(this.homey, 'listener.listened', {
                    name,
                    capability,
                    value,
                  }),
                )
                if (value === 'cool') {
                  await this.listenToTargetTemperature(listener)
                  return
                }
                await this.cleanListener(listener, 'temperature')
                const thermostatModes: string[] =
                  await this.getOtherThermostatModes(listener)
                if (thermostatModes.every((mode: string) => mode !== 'cool')) {
                  if (this.#outdoorTemperature.listener) {
                    await this.cleanListener(
                      this.#outdoorTemperature.listener,
                      'temperature',
                    )
                  }
                }
              },
            )
          this.log(
            new Event(this.homey, 'listener.created', { name, capability }),
          )
          if (currentThermostatMode === 'cool') {
            await this.listenToTargetTemperature(listener)
          }
        },
      ),
    )
  }

  private async getOtherThermostatModes(
    excludedListener: MELCloudListener,
  ): Promise<string[]> {
    return Promise.all(
      Object.values(this.#melCloudListeners)
        .filter(({ device: { id } }) => id !== excludedListener.device.id)
        .map(
          async ({ device: { id } }): Promise<string> =>
            // @ts-expect-error: `homey-api` is partially typed
            (await this.#api.devices.getCapabilityValue({
              deviceId: id,
              capabilityId: 'thermostat_mode',
            })) as string,
        ),
    )
  }

  private async listenToTargetTemperature(
    listener: MELCloudListener,
  ): Promise<void> {
    if ('temperature' in listener) {
      return
    }
    const capability: string = this.#names.temperature
    const capabilityId = 'target_temperature'
    const { device } = listener
    const deviceId: string = device.id
    const { name } = device
    await this.listenToOutdoorTemperature()
    const currentTargetTemperature: number =
      // @ts-expect-error: `homey-api` is partially typed
      (await this.#api.devices.getCapabilityValue({
        deviceId,
        capabilityId,
      })) as number
    this.#melCloudListeners[deviceId].temperature =
      device.makeCapabilityInstance(
        capabilityId,
        async (value: CapabilityValue): Promise<void> => {
          if (
            value === this.getTargetTemperature(this.getThreshold(deviceId))
          ) {
            return
          }
          this.log(
            new Event(this.homey, 'listener.listened', {
              name,
              capability,
              value: `${value as number}\u00A0°C`,
            }),
          )
          await this.handleTargetTemperature(
            listener,
            this.setThreshold(device, value as number),
          )
        },
      )
    this.log(new Event(this.homey, 'listener.created', { name, capability }))
    await this.handleTargetTemperature(
      listener,
      this.setThreshold(device, currentTargetTemperature),
    )
  }

  private async listenToOutdoorTemperature(): Promise<void> {
    if (
      !this.#outdoorTemperature.listener ||
      'temperature' in this.#outdoorTemperature.listener
    ) {
      return
    }
    const capability: string = this.#names.temperature
    const { capabilityId } = this.#outdoorTemperature
    const { device } = this.#outdoorTemperature.listener
    const deviceId: string = device.id
    const { name } = device
    this.#outdoorTemperature.value =
      // @ts-expect-error: `homey-api` is partially typed
      (await this.#api.devices.getCapabilityValue({
        deviceId,
        capabilityId,
      })) as number
    if ('temperature' in this.#outdoorTemperature.listener) {
      return
    }
    this.#outdoorTemperature.listener.temperature =
      device.makeCapabilityInstance(
        capabilityId,
        async (value: CapabilityValue): Promise<void> => {
          this.#outdoorTemperature.value = value as number
          this.log(
            new Event(this.homey, 'listener.listened', {
              name,
              capability,
              value: `${value}\u00A0°C`,
            }),
          )
          await Promise.all(
            Object.values(this.#melCloudListeners).map(
              async (listener: MELCloudListener): Promise<void> =>
                this.handleTargetTemperature(
                  listener,
                  this.getThreshold(listener.device.id),
                ),
            ),
          )
        },
      )
    this.log(new Event(this.homey, 'listener.created', { name, capability }))
  }

  private async handleTargetTemperature(
    listener: MELCloudListener,
    threshold: number,
  ): Promise<void> {
    await this.listenToOutdoorTemperature()
    if (!('temperature' in listener)) {
      return
    }
    await this.setTargetTemperature(listener, threshold)
  }

  private getTargetTemperature(threshold: number): number {
    return Math.min(
      Math.max(
        threshold,
        Math.ceil(this.#outdoorTemperature.value) - MAX_TEMPERATURE_GAP,
      ),
      MAX_TEMPERATURE,
    )
  }

  private async setTargetTemperature(
    listener: MELCloudListener,
    threshold: number,
  ): Promise<void> {
    if (!('temperature' in listener)) {
      return
    }
    const value: number = this.getTargetTemperature(threshold)
    try {
      await listener.temperature.setValue(value)
      this.log(
        new Event(this.homey, 'target_temperature.calculated', {
          name: listener.device.name,
          value: `${value}\u00A0°C`,
          threshold: `${threshold}\u00A0°C`,
          outdoorTemperature: `${this.#outdoorTemperature.value}\u00A0°C`,
        }),
      )
    } catch (error: unknown) {
      this.error(this.getErrorMessage(error))
    }
  }

  private getThreshold(deviceId: string): number {
    return this.getHomeySetting('thresholds')?.[deviceId] ?? 0
  }

  private setThreshold(
    device: HomeyAPIV3Local.ManagerDevices.Device,
    value: number,
  ): number {
    const thresholds: Thresholds = this.getHomeySetting('thresholds') ?? {}
    thresholds[device.id] = value
    this.setHomeySettings({ thresholds })
    this.log(
      new Event(this.homey, 'target_temperature.saved', {
        name: device.name,
        value: `${value}\u00A0°C`,
      }),
    )
    return value
  }

  private async cleanListeners(): Promise<void> {
    await Promise.all(
      Object.values(this.#melCloudListeners).map(
        async (listener: MELCloudListener): Promise<void> => {
          await this.cleanListener(listener, 'thermostatMode')
          await this.cleanListener(listener, 'temperature')
        },
      ),
    )
    this.#melCloudListeners = {}
    if (this.#outdoorTemperature.listener) {
      await this.cleanListener(this.#outdoorTemperature.listener, 'temperature')
    }
    this.log(new Event(this.homey, 'listener.cleaned_all'))
  }

  private async cleanListener<L extends TemperatureListener>(
    listener: L,
    capability: Exclude<keyof L, 'device'> & string,
  ): Promise<void> {
    if (!(capability in listener)) {
      return
    }
    const { device } = listener
    const deviceId: string = device.id
    const { name } = device
    ;(listener[capability] as DeviceCapability).destroy()
    this.log(
      new Event(this.homey, 'listener.cleaned', {
        name,
        capability: this.#names[capability],
      }),
    )
    if (deviceId === this.#outdoorTemperature.listener?.device.id) {
      delete this.#outdoorTemperature.listener.temperature
      return
    }
    if (capability === 'thermostatMode') {
      delete this.#melCloudListeners[deviceId].thermostatMode
    } else if (capability === 'temperature') {
      delete this.#melCloudListeners[deviceId].temperature
      await this.revertTemperature(device, this.getThreshold(deviceId))
    }
  }

  private async revertTemperature(
    device: HomeyAPIV3Local.ManagerDevices.Device,
    value: number,
  ): Promise<void> {
    try {
      await device.setCapabilityValue({
        capabilityId: 'target_temperature',
        value,
      })
      this.log(
        new Event(this.homey, 'target_temperature.reverted', {
          name: device.name,
          value: `${value}\u00A0°C`,
        }),
      )
    } catch (error: unknown) {
      this.error(this.getErrorMessage(error))
    }
  }

  private getHomeySetting<K extends keyof HomeySettings>(
    setting: K & string,
  ): HomeySettings[K] {
    return this.homey.settings.get(setting) as HomeySettings[K]
  }

  private setHomeySettings(settings: Partial<HomeySettings>): void {
    Object.entries(settings)
      .filter(
        ([setting, value]: [string, ValueOf<HomeySettings>]) =>
          value !== this.getHomeySetting(setting as keyof HomeySettings),
      )
      .forEach(([setting, value]: [string, ValueOf<HomeySettings>]) => {
        this.homey.settings.set(setting, value)
      })
  }

  private getErrorMessage(error: unknown): Event | string {
    if (error instanceof EventError) {
      return new Event(this.homey, error.name, error.params)
    }
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }
}

export = MELCloudExtensionApp
