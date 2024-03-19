/* eslint-disable
  @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
*/
import 'source-map-support/register'
import type { HomeySettings, TemperatureListenerData, ValueOf } from './types'
import { App } from 'homey'
import { HomeyAPIV3Local } from 'homey-api'
import ListenerEvent from './lib/ListenerEvent'
import ListenerEventError from './lib/ListenerEventError'
import MELCloudListener from './lib/MELCloudListener'
import OutdoorTemperatureListener from './lib/OutdoorTemperatureListener'

const DRIVER_ID = 'homey:app:com.mecloud:melcloud'
const SECONDS_1_IN_MILLISECONDS = 1000

class MELCloudExtensionApp extends App {
  public readonly names: Record<string, string> = Object.fromEntries(
    ['device', 'outdoorTemperature', 'temperature', 'thermostatMode'].map(
      (name: string): [string, string] => [
        name,
        this.homey.__(`names.${name}`),
      ],
    ),
  )

  #api!: HomeyAPIV3Local

  #initTimeout!: NodeJS.Timeout

  #melcloudDevices: HomeyAPIV3Local.ManagerDevices.Device[] = []

  #temperatureSensors: HomeyAPIV3Local.ManagerDevices.Device[] = []

  public get api(): HomeyAPIV3Local {
    return this.#api
  }

  public get melcloudDevices(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#melcloudDevices
  }

  public get temperatureSensors(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#temperatureSensors
  }

  public async autoAdjustCooling(
    { capabilityPath, enabled }: TemperatureListenerData = {
      capabilityPath: this.getHomeySetting('capabilityPath') ?? '',
      enabled: this.getHomeySetting('enabled') ?? false,
    },
  ): Promise<void> {
    await this.#destroyListeners()
    if (!capabilityPath) {
      if (enabled) {
        throw new ListenerEventError(this.homey, 'error.missing')
      }
      this.setHomeySettings({ capabilityPath, enabled })
      return
    }
    await OutdoorTemperatureListener.create(this, { capabilityPath, enabled })
    if (enabled) {
      await this.#listenToThermostatModes()
    }
  }

  public getHomeySetting<K extends keyof HomeySettings>(
    setting: Extract<K, string>,
  ): HomeySettings[K] {
    return this.homey.settings.get(setting) as HomeySettings[K]
  }

  public async onInit(): Promise<void> {
    this.#api = (await HomeyAPIV3Local.createAppAPI({
      homey: this.homey,
    })) as HomeyAPIV3Local
    // @ts-expect-error: `homey-api` is partially typed
    await this.#api.devices.connect()
    this.#init()
    // @ts-expect-error: `homey-api` is partially typed
    this.#api.devices.on('device.create', (): void => {
      this.#init()
    })
    // @ts-expect-error: `homey-api` is partially typed
    this.#api.devices.on('device.delete', (): void => {
      this.#init()
    })
    this.homey.on('unload', (): void => {
      this.#destroyListeners().catch((error: unknown): void => {
        this.error(error instanceof Error ? error.message : String(error))
      })
    })
  }

  public async onUninit(): Promise<void> {
    await this.#destroyListeners()
  }

  public setHomeySettings(settings: Partial<HomeySettings>): void {
    Object.entries(settings)
      .filter(
        ([setting, value]: [string, ValueOf<HomeySettings>]) =>
          value !== this.getHomeySetting(setting as keyof HomeySettings),
      )
      .forEach(([setting, value]: [string, ValueOf<HomeySettings>]) => {
        this.homey.settings.set(setting, value)
      })
  }

  async #destroyListeners(): Promise<void> {
    this.log(new ListenerEvent(this.homey, 'listener.cleaned_all'))
    await MELCloudListener.destroy()
    OutdoorTemperatureListener.destroy()
  }

  #getErrorMessage(error: unknown): ListenerEvent | string {
    if (error instanceof ListenerEventError) {
      return new ListenerEvent(this.homey, error.name, error.params)
    }
    return error instanceof Error ? error.message : String(error)
  }

  #init(): void {
    this.homey.clearTimeout(this.#initTimeout)
    this.#initTimeout = this.homey.setTimeout(async (): Promise<void> => {
      try {
        await this.#loadDevices()
        await this.autoAdjustCooling()
      } catch (error: unknown) {
        this.error(this.#getErrorMessage(error))
      }
    }, SECONDS_1_IN_MILLISECONDS)
  }

  async #listenToThermostatModes(): Promise<void> {
    await Promise.all(
      this.#melcloudDevices.map(
        async (device: HomeyAPIV3Local.ManagerDevices.Device): Promise<void> =>
          new MELCloudListener(this, device).listenToThermostatMode(),
      ),
    )
  }

  async #loadDevices(): Promise<void> {
    this.#melcloudDevices = []
    this.#temperatureSensors = []
    const devices: HomeyAPIV3Local.ManagerDevices.Device[] =
      // @ts-expect-error: `homey-api` is partially typed
      (await this.#api.devices.getDevices()) as HomeyAPIV3Local.ManagerDevices.Device[]
    Object.values(devices).forEach(
      (device: HomeyAPIV3Local.ManagerDevices.Device) => {
        // @ts-expect-error: `homey-api` is partially typed
        if (device.driverId === DRIVER_ID) {
          this.#melcloudDevices.push(device)
        }
        if (
          // @ts-expect-error: `homey-api` is partially typed
          (device.capabilities as string[]).some((capability: string) =>
            capability.startsWith('measure_temperature'),
          )
        ) {
          this.#temperatureSensors.push(device)
        }
      },
    )
  }
}

export = MELCloudExtensionApp
