/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import 'source-map-support/register'
import { App } from 'homey' // eslint-disable-line import/no-extraneous-dependencies
import { HomeyAPIV3Local } from 'homey-api'
import pushEventsToUI from './decorators/pushEventsToUI'
import Event from './lib/Event'
import type {
  CapabilityValue,
  HomeySettings,
  HomeySettingValue,
  MELCloudListener,
  TemperatureListener,
  TemperatureListenerData,
  Thresholds,
} from './types'

const melcloudAtaDriverId = 'homey:app:com.mecloud:melcloud'

@pushEventsToUI
class MELCloudExtensionApp extends App {
  #names!: Record<string, string>

  #api!: HomeyAPIV3Local

  #melCloudListeners: Record<string, MELCloudListener> = {}

  readonly #outdoorTemperature: {
    capabilityId: string
    value: number
    listener?: TemperatureListener
  } = { capabilityId: '', value: 0 }

  melCloudDevices!: HomeyAPIV3Local.ManagerDevices.Device[]

  async onInit(): Promise<void> {
    this.#names = Object.fromEntries(
      ['device', 'outdoor_temperature', 'temperature', 'thermostat_mode'].map(
        (name: string): [string, string] => [
          name,
          this.homey.__(`names.${name}`),
        ],
      ),
    )

    this.#api = (await HomeyAPIV3Local.createAppAPI({
      homey: this.homey,
    })) as HomeyAPIV3Local
    // @ts-expect-error: homey-api is partially typed
    await this.#api.devices.connect()
    await this.initialize(true)

    // @ts-expect-error: homey-api is partially typed
    this.#api.devices.on('device.create', async (): Promise<void> => {
      await this.initialize()
    })
    // @ts-expect-error: homey-api is partially typed
    this.#api.devices.on('device.delete', async (): Promise<void> => {
      await this.initialize()
    })
    this.homey.on('unload', (): void => {
      this.cleanListeners().catch((error: Error): void => {
        this.error(new Event(error.message))
      })
    })
  }

  private async initialize(retry = false): Promise<void> {
    await this.refreshDevices()
    try {
      await this.autoAdjustCoolingAta()
    } catch (error: unknown) {
      this.error(
        new Event(error instanceof Error ? error.message : String(error)),
      )
      if (retry) {
        this.log(new Event({}, 'retry'))
        this.homey.setTimeout(async (): Promise<void> => {
          await this.initialize()
        }, 60000)
      }
    }
  }

  private async cleanListeners(): Promise<void> {
    await Promise.all(
      Object.values(this.#melCloudListeners).map(
        async (listener: MELCloudListener): Promise<void> => {
          await this.cleanListener(listener, 'thermostat_mode')
          await this.cleanListener(listener, 'temperature')
        },
      ),
    )
    this.#melCloudListeners = {}
    if (this.#outdoorTemperature.listener) {
      await this.cleanListener(this.#outdoorTemperature.listener, 'temperature')
    }
    this.log(new Event({}, 'listener.cleaned_all'))
  }

  private async cleanListener<T extends TemperatureListener>(
    listener: T extends MELCloudListener
      ? MELCloudListener
      : TemperatureListener,
    capability: T extends MELCloudListener
      ? keyof MELCloudListener
      : keyof TemperatureListener,
  ): Promise<void> {
    if (!(capability in listener)) {
      return
    }
    const { device } = listener
    const deviceId: string = device.id
    const { name } = device
    listener[capability].destroy()
    this.log(
      new Event(
        {
          name,
          capability: this.#names[capability],
        },
        'listener.cleaned',
      ),
    )
    if (deviceId === this.#outdoorTemperature.listener?.device.id) {
      delete this.#outdoorTemperature.listener.temperature
      return
    }
    if (capability === 'thermostat_mode') {
      delete this.#melCloudListeners[deviceId].thermostat_mode
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
        new Event(
          {
            name: device.name,
            value: `${value}\u00A0°C`,
          },
          'target_temperature.reverted',
        ),
      )
    } catch (error: unknown) {
      this.error(
        new Event(error instanceof Error ? error.message : String(error)),
      )
    }
  }

  private getThreshold(deviceId: string): number {
    return this.homey.settings.get('thresholds')[deviceId] as number
  }

  private setThreshold(
    device: HomeyAPIV3Local.ManagerDevices.Device,
    value: number,
  ): number {
    const thresholds: Thresholds =
      (this.homey.settings.get('thresholds') as HomeySettings['thresholds']) ??
      {}
    thresholds[device.id] = value
    this.setSettings({ thresholds })
    this.log(
      new Event(
        {
          name: device.name,
          value: `${value}\u00A0°C`,
        },
        'target_temperature.saved',
      ),
    )
    return value
  }

  async refreshDevices(): Promise<HomeyAPIV3Local.ManagerDevices.Device[]> {
    this.melCloudDevices = []
    const devices: HomeyAPIV3Local.ManagerDevices.Device[] =
      // @ts-expect-error: homey-api is partially typed
      (await this.#api.devices.getDevices()) as HomeyAPIV3Local.ManagerDevices.Device[]
    return Object.values(devices).reduce<
      HomeyAPIV3Local.ManagerDevices.Device[]
    >((acc, device: HomeyAPIV3Local.ManagerDevices.Device) => {
      // @ts-expect-error: homey-api is partially typed
      if (device.driverId === melcloudAtaDriverId) {
        this.melCloudDevices.push(device)
      } else if (
        // @ts-expect-error: homey-api is partially typed
        device.capabilities.some((capability: string) =>
          capability.startsWith('measure_temperature'),
        )
      ) {
        acc.push(device)
      }
      return acc
    }, [])
  }

  async autoAdjustCoolingAta(
    { capabilityPath, enabled }: TemperatureListenerData = {
      capabilityPath:
        (this.homey.settings.get(
          'capabilityPath',
        ) as HomeySettings['capabilityPath']) ?? '',
      enabled:
        (this.homey.settings.get('enabled') as HomeySettings['enabled']) ??
        false,
    },
  ): Promise<void> {
    if (!capabilityPath) {
      if (enabled) {
        throw new Error(this.homey.__('log.error.missing'))
      }
      this.setSettings({
        capabilityPath,
        enabled,
      })
      await this.cleanListeners()
      return
    }
    await this.handleTemperatureListenerData({
      capabilityPath,
      enabled,
    })
    if (enabled) {
      await this.listenToThermostatModes()
    }
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
      this.setSettings({
        capabilityPath,
        enabled,
      })
      if (!this.#outdoorTemperature.listener) {
        this.#outdoorTemperature.listener = { device }
      } else if (device.id !== this.#outdoorTemperature.listener.device.id) {
        this.#outdoorTemperature.listener.device = device
      }
      this.#outdoorTemperature.capabilityId = capabilityId
      this.handleOutdoorTemperatureDeviceUpdate(capabilityPath)
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : String(error))
    } finally {
      await this.cleanListeners()
    }
  }

  private async validateCapabilityPath(
    capabilityPath: string,
  ): Promise<[HomeyAPIV3Local.ManagerDevices.Device, string]> {
    const [deviceId, capabilityId]: string[] = capabilityPath.split(':')
    let device: HomeyAPIV3Local.ManagerDevices.Device | null = null
    try {
      // @ts-expect-error: homey-api is partially typed
      device = (await this.#api.devices.getDevice({
        id: deviceId,
      })) as HomeyAPIV3Local.ManagerDevices.Device | null
    } catch (error: unknown) {
      throw new Error(
        this.homey.__('log.error.not_found', {
          name: this.#names.device,
          id: deviceId,
        }),
      )
    }
    // @ts-expect-error: homey-api is partially typed
    if (!device || !(capabilityId in (device.capabilitiesObj ?? {}))) {
      throw new Error(
        this.homey.__('log.error.not_found', {
          name: this.#names.outdoor_temperature,
          id: capabilityId,
        }),
      )
    }
    return [device, capabilityId]
  }

  private handleOutdoorTemperatureDeviceUpdate(capabilityPath: string): void {
    // @ts-expect-error: homey-api is partially typed
    this.#outdoorTemperature.listener.device.on(
      'update',
      async (): Promise<void> => {
        if (
          !(
            this.#outdoorTemperature.capabilityId in
            // @ts-expect-error: homey-api is partially typed
            (this.#outdoorTemperature.listener.device.capabilitiesObj ?? {})
          )
        ) {
          this.error(
            new Event(
              {
                name: this.#names.outdoor_temperature,
                id: capabilityPath,
              },
              'error.not_found',
            ),
          )
          await this.cleanListeners()
        }
      },
    )
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
    const capability: string = this.#names.thermostat_mode
    const capabilityId = 'thermostat_mode'
    await Promise.all(
      Object.values(this.#melCloudListeners).map(
        async (listener: MELCloudListener): Promise<void> => {
          const { device } = listener
          const deviceId: string = device.id
          const { name } = device
          const currentThermostatMode: string =
            // @ts-expect-error: homey-api is partially typed
            (await this.#api.devices.getCapabilityValue({
              deviceId,
              capabilityId,
            })) as string
          this.#melCloudListeners[deviceId].thermostat_mode =
            device.makeCapabilityInstance(
              capabilityId,
              async (value: CapabilityValue): Promise<void> => {
                this.log(
                  new Event(
                    {
                      name,
                      capability,
                      value,
                    },
                    'listener.listened',
                  ),
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
            new Event(
              {
                name,
                capability,
              },
              'listener.created',
            ),
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
    const capabilityId = 'thermostat_mode'
    return Promise.all(
      Object.values(this.#melCloudListeners)
        .filter(({ device }) => device.id !== excludedListener.device.id)
        .map(
          ({ device }): Promise<string> =>
            // @ts-expect-error: homey-api is partially typed
            this.#api.devices.getCapabilityValue({
              deviceId: device.id,
              capabilityId,
            }) as string,
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
      // @ts-expect-error: homey-api is partially typed
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
            new Event(
              {
                name,
                capability,
                value: `${value as number}\u00A0°C`,
              },
              'listener.listened',
            ),
          )
          await this.handleTargetTemperature(
            listener,
            this.setThreshold(device, value as number),
          )
        },
      )
    this.log(
      new Event(
        {
          name,
          capability,
        },
        'listener.created',
      ),
    )
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
      // @ts-expect-error: homey-api is partially typed
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
            new Event(
              {
                name,
                capability,
                value: `${value}\u00A0°C`,
              },
              'listener.listened',
            ),
          )
          await Promise.all(
            Object.values(this.#melCloudListeners).map(
              (listener: MELCloudListener): Promise<void> =>
                this.handleTargetTemperature(
                  listener,
                  this.getThreshold(listener.device.id),
                ),
            ),
          )
        },
      )
    this.log(
      new Event(
        {
          name,
          capability,
        },
        'listener.created',
      ),
    )
  }

  private getTargetTemperature(threshold: number): number {
    return Math.min(
      Math.max(threshold, Math.ceil(this.#outdoorTemperature.value) - 8),
      38,
    )
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
        new Event(
          {
            name: listener.device.name,
            value: `${value}\u00A0°C`,
            threshold: `${threshold}\u00A0°C`,
            outdoorTemperature: `${this.#outdoorTemperature.value}\u00A0°C`,
          },
          'target_temperature.calculated',
        ),
      )
    } catch (error: unknown) {
      this.error(
        new Event(error instanceof Error ? error.message : String(error)),
      )
    }
  }

  private setSettings(settings: Partial<HomeySettings>): void {
    Object.entries(settings)
      .filter(
        ([setting, value]: [string, HomeySettingValue]) =>
          value !== this.homey.settings.get(setting),
      )
      .forEach(([setting, value]: [string, HomeySettingValue]): void => {
        this.homey.settings.set(setting, value)
      })
  }

  async onUninit(): Promise<void> {
    await this.cleanListeners()
  }
}

export = MELCloudExtensionApp
