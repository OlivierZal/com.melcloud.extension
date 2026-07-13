import { HomeyAPIV3Local } from 'homey-api'
import { Temporal } from 'temporal-polyfill'

import { changelog } from './files.mts'
import { fireAndForget } from './lib/fire-and-forget.mts'
import { getErrorMessage } from './lib/get-error-message.mts'
import { type Homey, App } from './lib/homey.mts'
import { ListenerError } from './listeners/error.mts'
import { OutdoorTemperatureListener } from './listeners/outdoor-temperature.mts'
import {
  type ListenerParams,
  type Names,
  type TemperatureListenerData,
  type TimestampedLog,
  MEASURE_TEMPERATURE,
  OUTDOOR_TEMPERATURE,
} from './types.mts'

// The MELCloud app id is com.mecloud (historical typo). AC units come from
// its Classic ATA driver and its MELCloud Home ATA driver.
const ATA_DRIVER_IDS = new Set([
  'homey:app:com.mecloud:home-melcloud',
  'homey:app:com.mecloud:melcloud',
])

const MAX_LOGS = 100
const INIT_DELAY = 1000
const NOTIFICATION_DELAY = 10_000

// Main Homey app: discovers MELCloud AC devices and outdoor temperature
// sensors, then manages automatic cooling adjustment listeners.
export default class MELCloudExtensionApp extends App {
  declare public readonly homey: Homey.Homey

  public get api(): HomeyAPIV3Local {
    return this.#api
  }

  public get melcloudDevices(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#melcloudDevices
  }

  public get names(): Names {
    return {
      device: this.homey.__('names.device'),
      outdoorTemperature: this.homey.__('names.outdoorTemperature'),
      temperature: this.homey.__('names.temperature'),
      thermostatMode: this.homey.__('names.thermostatMode'),
    }
  }

  public get temperatureSensors(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#temperatureSensors
  }

  #api!: HomeyAPIV3Local

  #initTimeout: NodeJS.Timeout | null = null

  readonly #melcloudDevices: HomeyAPIV3Local.ManagerDevices.Device[] = []

  #outdoorListener: OutdoorTemperatureListener | null = null

  readonly #temperatureSensors: HomeyAPIV3Local.ManagerDevices.Device[] = []

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
      fireAndForget(this.#destroyListener(), (error) => {
        this.error(getErrorMessage(error))
      })
    })
    this.#createNotification()
  }

  public override async onUninit(): Promise<void> {
    await this.#destroyListener()
  }

  // Starts or restarts automatic cooling adjustment. Destroys existing
  // listeners first, then creates new ones from the provided or stored
  // settings.
  public async autoAdjustCooling(
    temperatureListenerData?: TemperatureListenerData,
  ): Promise<void> {
    const { capabilityPath, isEnabled } = temperatureListenerData ?? {
      capabilityPath: this.homey.settings.get('capabilityPath') ?? ':',
      isEnabled: this.homey.settings.get('isEnabled') === true,
    }
    await this.#destroyListener()
    try {
      this.#outdoorListener = await OutdoorTemperatureListener.create(this, {
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

  // Parses "category.messageId" (e.g. "error.notFound") into a log entry
  // and broadcasts it to the settings UI via realtime events.
  public pushToUI(name: string, params?: ListenerParams): void {
    const [messageId = '', category] = name.split('.').toReversed()
    const translated = this.homey.__(`log.${messageId}`, params)
    const newLog: TimestampedLog = {
      category: category ?? messageId,
      // Fix i18n grammar: "de el" → "del" (Spanish), "de le" → "du" (French)
      message: (translated === '' ? messageId : translated)
        .replaceAll(/de el /giv, 'del ')
        .replaceAll(/de le /giv, 'du '),
      time: Temporal.Now.instant().epochMilliseconds,
    }
    this.homey.api.realtime('log', newLog)
    this.#persistLog(newLog)
  }

  #createNotification(): void {
    const { homey } = this
    const {
      manifest: { version },
      notifications,
      settings,
    } = homey
    if (settings.get('notifiedVersion') === version) {
      return
    }
    const changelogByVersion = changelog as Record<
      string,
      Record<string, string>
    >
    const versionChangelog = changelogByVersion[version] ?? {}
    const excerpt = versionChangelog[homey.i18n.getLanguage()]
    if (excerpt === undefined) {
      return
    }
    homey.setTimeout(async () => {
      try {
        await notifications.createNotification({ excerpt })
        settings.set('notifiedVersion', version)
      } catch {
        // Non-critical: notification display is best-effort
      }
    }, NOTIFICATION_DELAY)
  }

  async #destroyListener(): Promise<void> {
    this.pushToUI('cleanedAll')
    await this.#outdoorListener?.destroy()
    this.#outdoorListener = null
  }

  // Debounces device list reload: rapid device.create/delete events
  // are coalesced into a single init after INIT_DELAY.
  #init(): void {
    this.homey.clearTimeout(this.#initTimeout)
    this.#initTimeout = this.homey.setTimeout(async () => {
      await this.#loadDevices()
      await this.autoAdjustCooling()
    }, INIT_DELAY)
  }

  // Categorizes all Homey devices into MELCloud AC units and temperature
  // sensors, and defaults the outdoor source to the first MELCloud device
  // that actually reports an outdoor temperature (Home devices do not).
  async #loadDevices(): Promise<void> {
    this.#melcloudDevices.length = 0
    this.#temperatureSensors.length = 0
    const devices = await this.#api.devices.getDevices()
    for (const device of Object.values(devices)) {
      if (ATA_DRIVER_IDS.has(device.driverId)) {
        this.#melcloudDevices.push(device)
        if (
          this.homey.settings.get('capabilityPath') === null &&
          device.capabilities.includes(OUTDOOR_TEMPERATURE)
        ) {
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

  #persistLog(newLog: TimestampedLog): void {
    const lastLogs = this.homey.settings.get('lastLogs') ?? []
    lastLogs.unshift(newLog)
    if (lastLogs.length > MAX_LOGS) {
      lastLogs.length = MAX_LOGS
    }
    this.homey.settings.set('lastLogs', lastLogs)
  }
}
