import 'source-map-support/register.js'

// eslint-disable-next-line import-x/no-extraneous-dependencies
import Homey from 'homey'

import { HomeyAPIV3Local } from 'homey-api'

import { changelog } from './files.mts'
import { ListenerError } from './listeners/error.mts'
import { MELCloudListener } from './listeners/melcloud.mts'
import { OutdoorTemperatureListener } from './listeners/outdoor-temperature.mts'
import {
  type ListenerParams,
  type TemperatureListenerData,
  type TimestampedLog,
  MEASURE_TEMPERATURE,
  OUTDOOR_TEMPERATURE,
} from './types.mts'

MELCloudListener.setOutdoorTemperatureListener(OutdoorTemperatureListener)

const MELCLOUD_DRIVER_ID = 'homey:app:com.mecloud:melcloud'

const MAX_LOGS = 100
const INIT_DELAY = 1000
const NOTIFICATION_DELAY = 10_000

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const hasChangelogLanguage = (
  versionChangelog: object,
  language: string,
): language is keyof typeof versionChangelog => language in versionChangelog

// eslint-disable-next-line import-x/no-named-as-default-member
export default class MELCloudExtensionApp extends Homey.App {
  declare public homey: Homey.Homey

  public readonly names = Object.fromEntries(
    ['device', 'outdoorTemperature', 'temperature', 'thermostatMode'].map(
      (name) => [name, this.homey.__(`names.${name}`)],
    ),
  )

  readonly #melcloudDevices: HomeyAPIV3Local.ManagerDevices.Device[] = []

  readonly #temperatureSensors: HomeyAPIV3Local.ManagerDevices.Device[] = []

  #api!: HomeyAPIV3Local

  #initTimeout: NodeJS.Timeout | null = null

  public get api(): HomeyAPIV3Local {
    return this.#api
  }

  public get melcloudDevices(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#melcloudDevices
  }

  public get temperatureSensors(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#temperatureSensors
  }

  public override async onInit(): Promise<void> {
    this.#api = await HomeyAPIV3Local.createAppAPI({ homey: this.homey })
    await this.#api.devices.connect()
    this.#init()
    this.#api.devices.on('device.create', () => {
      this.#init()
    })
    this.#api.devices.on('device.delete', () => {
      this.#init()
    })
    this.homey.on('unload', () => {
      this.#destroyListeners().catch(() => {
        //
      })
    })
    this.#createNotification()
  }

  public override async onUninit(): Promise<void> {
    await this.#destroyListeners()
  }

  public async autoAdjustCooling(
    temperatureListenerData?: TemperatureListenerData,
  ): Promise<void> {
    const { capabilityPath, isEnabled } = temperatureListenerData ?? {
      capabilityPath: this.homey.settings.get('capabilityPath') ?? ':',
      isEnabled: this.homey.settings.get('isEnabled') === true,
    }
    await this.#destroyListeners()
    try {
      await OutdoorTemperatureListener.create(this, {
        capabilityPath,
        isEnabled,
      })
    } catch (error) {
      if (error instanceof ListenerError) {
        this.pushToUI(error.message, error.cause)
        return
      }
      this.pushToUI(getErrorMessage(error))
    }
  }

  public pushToUI(name: string, params?: ListenerParams): void {
    const [messageId, category = messageId] = name.split('.').toReversed()
    if (messageId !== undefined) {
      const newLog: TimestampedLog = {
        category,
        message: (this.homey.__(`log.${messageId}`, params) || messageId)
          .replaceAll(/de el /giu, 'del ')
          .replaceAll(/de le /giu, 'du '),
        time: Date.now(),
      }
      this.homey.api.realtime('log', newLog)
      const lastLogs = this.homey.settings.get('lastLogs') ?? []
      lastLogs.unshift(newLog)
      if (lastLogs.length > MAX_LOGS) {
        lastLogs.length = MAX_LOGS
      }
      this.homey.settings.set('lastLogs', lastLogs)
    }
  }

  #createNotification(): void {
    const { homey } = this
    const {
      i18n,
      manifest: { version },
      notifications,
      settings,
    } = homey
    if (settings.get('notifiedVersion') !== version) {
      const { [version]: versionChangelog = {} } = changelog as Record<
        string,
        object
      >
      const language = i18n.getLanguage()
      if (language in versionChangelog) {
        homey.setTimeout(async () => {
          try {
            if (hasChangelogLanguage(versionChangelog, language)) {
              await notifications.createNotification({
                excerpt: versionChangelog[language],
              })
              settings.set('notifiedVersion', version)
            }
          } catch {}
        }, NOTIFICATION_DELAY)
      }
    }
  }

  async #destroyListeners(): Promise<void> {
    this.pushToUI('cleanedAll')
    await MELCloudListener.destroy()
    await OutdoorTemperatureListener.destroy()
  }

  #init(): void {
    this.homey.clearTimeout(this.#initTimeout)
    this.#initTimeout = this.homey.setTimeout(async () => {
      await this.#loadDevices()
      await this.autoAdjustCooling()
    }, INIT_DELAY)
  }

  async #loadDevices(): Promise<void> {
    this.#melcloudDevices.length = 0
    this.#temperatureSensors.length = 0
    const devices = await this.#api.devices.getDevices()
    for (const device of Object.values(devices)) {
      if (device.driverId === MELCLOUD_DRIVER_ID) {
        this.#melcloudDevices.push(device)
        if (this.homey.settings.get('capabilityPath') === null) {
          this.homey.settings.set(
            'capabilityPath',
            `${device.id}:${OUTDOOR_TEMPERATURE}`,
          )
        }
      }
      if (
        device.capabilities.some((capability) =>
          capability.startsWith(MEASURE_TEMPERATURE),
        )
      ) {
        this.#temperatureSensors.push(device)
      }
    }
  }
}
