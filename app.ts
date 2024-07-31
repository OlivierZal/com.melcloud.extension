import { App } from 'homey'
import { HomeyAPIV3Local } from 'homey-api'
import 'source-map-support/register'

import type {
  HomeySettings,
  ListenerEventParams,
  TemperatureListenerData,
  TimestampedLog,
} from './types'

import ListenerError from './lib/ListenerError'
import MELCloudListener from './lib/MELCloudListener'
import OutdoorTemperatureListener from './lib/OutdoorTemperatureListener'

const MAX_LOGS = 100
const SECONDS_1_IN_MILLISECONDS = 1000

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export = class extends App {
  public readonly names = Object.fromEntries(
    ['device', 'outdoorTemperature', 'temperature', 'thermostatMode'].map(
      (name) => [name, this.homey.__(`names.${name}`)],
    ),
  )

  #api!: HomeyAPIV3Local

  #initTimeout: NodeJS.Timeout | null = null

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
    { capabilityPath, isEnabled }: TemperatureListenerData = {
      capabilityPath: this.getHomeySetting('capabilityPath') ?? ':',
      isEnabled: this.getHomeySetting('isEnabled') ?? false,
    },
  ): Promise<void> {
    await this.#destroyListeners()
    try {
      await OutdoorTemperatureListener.create(this, {
        capabilityPath,
        isEnabled,
      })
    } catch (error) {
      if (error instanceof ListenerError) {
        this.pushToUI(error.message, error.params)
        return
      }
      this.pushToUI(getErrorMessage(error))
    }
  }

  public getHomeySetting<K extends keyof HomeySettings>(
    setting: Extract<K, string>,
  ): HomeySettings[K] {
    return this.homey.settings.get(setting) as HomeySettings[K]
  }

  public override async onInit(): Promise<void> {
    this.#api = (await HomeyAPIV3Local.createAppAPI({
      homey: this.homey,
    })) as HomeyAPIV3Local
    // @ts-expect-error: `homey-api` is partially typed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await this.#api.devices.connect()
    this.#init()
    // @ts-expect-error: `homey-api` is partially typed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    this.#api.devices.on('device.create', () => {
      this.#init()
    })
    // @ts-expect-error: `homey-api` is partially typed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    this.#api.devices.on('device.delete', () => {
      this.#init()
    })
    this.homey.on('unload', () => {
      this.#destroyListeners().catch((error: unknown) => {
        this.error(getErrorMessage(error))
      })
    })
  }

  public override async onUninit(): Promise<void> {
    await this.#destroyListeners()
  }

  public pushToUI(name: string, params?: ListenerEventParams): void {
    const newLog: TimestampedLog = {
      category: name.startsWith('error.') ? 'error' : name,
      message: this.homey.__(`log.${name}`, params),
      time: Date.now(),
    }
    this.homey.api.realtime('log', newLog)
    const lastLogs = this.getHomeySetting('lastLogs') ?? []
    lastLogs.unshift(newLog)
    if (lastLogs.length > MAX_LOGS) {
      lastLogs.length = MAX_LOGS
    }
    this.setHomeySettings({ lastLogs })
  }

  public setHomeySettings(settings: Partial<HomeySettings>): void {
    Object.entries(settings).forEach(([setting, value]) => {
      if (value !== this.getHomeySetting(setting as keyof HomeySettings)) {
        this.homey.settings.set(setting, value)
      }
    })
  }

  async #destroyListeners(): Promise<void> {
    this.pushToUI('cleanedAll')
    await MELCloudListener.destroy()
    OutdoorTemperatureListener.destroy()
  }

  #init(): void {
    this.homey.clearTimeout(this.#initTimeout)
    this.#initTimeout = this.homey.setTimeout(async () => {
      await this.#loadDevices()
      await this.autoAdjustCooling()
    }, SECONDS_1_IN_MILLISECONDS)
  }

  async #loadDevices(): Promise<void> {
    this.#melcloudDevices = []
    this.#temperatureSensors = []
    const devices =
      // @ts-expect-error: `homey-api` is partially typed
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (await this.#api.devices.getDevices()) as HomeyAPIV3Local.ManagerDevices.Device[]
    Object.values(devices).forEach((device) => {
      // @ts-expect-error: `homey-api` is partially typed
      if (device.driverId === 'homey:app:com.mecloud:melcloud') {
        this.#melcloudDevices.push(device)
        if (this.getHomeySetting('capabilityPath') === null) {
          this.setHomeySettings({
            capabilityPath: `${device.id}:measure_temperature.outdoor`,
          })
        }
      }
      if (
        // @ts-expect-error: `homey-api` is partially typed
        (device.capabilities as string[]).some((capability) =>
          capability.startsWith('measure_temperature'),
        )
      ) {
        this.#temperatureSensors.push(device)
      }
    })
  }
}
