import type ApiApp from 'homey/lib/ApiApp'
import { HomeyAPIV3Local } from 'homey-api'
import { Temporal } from 'temporal-polyfill'

import type { OutdoorSource } from './listeners/outdoor-source.mts'
import { changelog } from './files.mts'
import { fireAndForget } from './lib/fire-and-forget.mts'
import { getErrorMessage } from './lib/get-error-message.mts'
import { type Homey, App } from './lib/homey.mts'
import { toDeviceGroups } from './lib/to-device-groups.mts'
import { CapabilityOutdoorSource } from './listeners/capability-source.mts'
import { ListenerError } from './listeners/error.mts'
import { MELCloudListener } from './listeners/melcloud.mts'
import { WeatherOutdoorSource } from './listeners/weather-source.mts'
import {
  type DeviceGroups,
  type ListenerParams,
  type Names,
  type TemperatureListenerData,
  type TimestampedLog,
  DISABLED_SOURCE,
  MEASURE_TEMPERATURE,
} from './types.mts'

// The MELCloud app id is com.mecloud (historical typo). AC units come from
// its Classic ATA driver and its MELCloud Home ATA driver.
const MELCLOUD_APP_ID = 'com.mecloud'
const ATA_DRIVER_IDS = new Set([
  `homey:app:${MELCLOUD_APP_ID}:home-melcloud`,
  `homey:app:${MELCLOUD_APP_ID}:melcloud`,
])

const MAX_LOGS = 100
const INIT_DELAY = 1000
const NOTIFICATION_DELAY = 10_000

// Registry key for the shared Homey-weather source (devices configured
// on a capability use their "deviceId:capabilityId" path as key)
const WEATHER_SOURCE_KEY = 'homey:weather'

// Main Homey app: discovers MELCloud AC devices and outdoor temperature
// sensors, then manages automatic cooling adjustment listeners.
export default class MELCloudExtensionApp extends App {
  declare public readonly homey: Homey.Homey

  public get api(): HomeyAPIV3Local {
    return this.#api
  }

  public get deviceGroups(): DeviceGroups | null {
    return this.#deviceGroups
  }

  public get melcloudDevices(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#melcloudDevices
  }

  public get names(): Names {
    return {
      device: this.homey.__('names.device'),
      homeyWeather: this.homey.__('names.homeyWeather'),
      outdoorTemperature: this.homey.__('names.outdoorTemperature'),
      temperature: this.homey.__('names.temperature'),
      thermostatMode: this.homey.__('names.thermostatMode'),
    }
  }

  public get temperatureSensors(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#temperatureSensors
  }

  #api!: HomeyAPIV3Local

  #deviceGroups: DeviceGroups | null = null

  readonly #deviceListeners: MELCloudListener[] = []

  #initTimeout: NodeJS.Timeout | null = null

  #melcloudApp!: ApiApp

  readonly #melcloudDevices: HomeyAPIV3Local.ManagerDevices.Device[] = []

  readonly #sources = new Map<string, OutdoorSource>()

  readonly #temperatureSensors: HomeyAPIV3Local.ManagerDevices.Device[] = []

  public override async onInit(): Promise<void> {
    this.#melcloudApp = this.homey.api.getApiApp(MELCLOUD_APP_ID)
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
      fireAndForget(this.#destroyListeners(), (error) => {
        this.error(getErrorMessage(error))
      })
    })
    this.#createNotification()
  }

  public override async onUninit(): Promise<void> {
    await this.#destroyListeners()
  }

  // Starts or restarts automatic cooling adjustment. Destroys existing
  // listeners first, then creates one listener per AC device from the
  // provided or stored per-device outdoor sources. A device whose source
  // fails to validate is reported and skipped; the others keep running.
  public async autoAdjustCooling(
    temperatureListenerData?: TemperatureListenerData,
  ): Promise<void> {
    const { isEnabled, outdoorSources } =
      temperatureListenerData ?? this.#getStoredListenerData()
    await this.#destroyListeners()
    this.homey.settings.set('isEnabled', isEnabled)
    this.homey.settings.set('outdoorSources', outdoorSources)
    if (!isEnabled) {
      return
    }
    await Promise.all(
      this.#melcloudDevices
        .filter(({ id }) => (outdoorSources[id] ?? null) !== DISABLED_SOURCE)
        .map(async (device) =>
          this.#listenToDevice(device, outdoorSources[device.id] ?? null),
        ),
    )
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

  async #destroyListeners(): Promise<void> {
    this.pushToUI('cleanedAll')
    await Promise.all(
      this.#deviceListeners.map(async (listener) => listener.destroy()),
    )
    this.#deviceListeners.length = 0
    for (const source of this.#sources.values()) {
      source.destroy()
    }
    this.#sources.clear()
  }

  // Building grouping served by com.melcloud's inter-app API; anything
  // off (older app version, not installed, bad payload) reads as "no
  // grouping" and the settings fall back to the per-device list.
  async #fetchDeviceGroups(): Promise<DeviceGroups | null> {
    try {
      const payload: unknown = await this.#melcloudApp.get('/device_groups')
      return toDeviceGroups(payload)
    } catch {
      return null
    }
  }

  async #getSource(sourcePath: string | null): Promise<OutdoorSource> {
    const key = sourcePath ?? WEATHER_SOURCE_KEY
    const existing = this.#sources.get(key)
    if (existing !== undefined) {
      return existing
    }
    const source =
      sourcePath === null ?
        new WeatherOutdoorSource(this)
      : await CapabilityOutdoorSource.create(this, sourcePath)
    this.#sources.set(key, source)
    return source
  }

  #getStoredListenerData(): TemperatureListenerData {
    return {
      isEnabled: this.homey.settings.get('isEnabled') === true,
      outdoorSources: this.homey.settings.get('outdoorSources') ?? {},
    }
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

  async #listenToDevice(
    device: HomeyAPIV3Local.ManagerDevices.Device,
    sourcePath: string | null,
  ): Promise<void> {
    try {
      const source = await this.#getSource(sourcePath)
      const listener = new MELCloudListener(this, device, source)
      this.#deviceListeners.push(listener)
      await listener.listenToThermostatMode()
    } catch (error) {
      if (error instanceof ListenerError) {
        this.pushToUI(error.message, error.cause)
        return
      }
      this.pushToUI(getErrorMessage(error))
    }
  }

  // Categorizes all Homey devices into MELCloud AC units and temperature
  // sensors. Devices without an explicit source use the Homey weather.
  async #loadDevices(): Promise<void> {
    this.#melcloudDevices.length = 0
    this.#temperatureSensors.length = 0
    const devices = await this.#api.devices.getDevices()
    for (const device of Object.values(devices)) {
      if (ATA_DRIVER_IDS.has(device.driverId)) {
        this.#melcloudDevices.push(device)
      }
      if (
        device.capabilities.some((capability) =>
          capability.startsWith(MEASURE_TEMPERATURE),
        )
      ) {
        this.#temperatureSensors.push(device)
      }
    }
    this.#deviceGroups = await this.#fetchDeviceGroups()
    this.#migrateLegacySource()
  }

  // Older versions stored one global outdoor source: seed every known AC
  // device with it once, then drop the legacy key.
  #migrateLegacySource(): void {
    const legacyPath = this.homey.settings.get('capabilityPath')
    if (typeof legacyPath !== 'string') {
      return
    }
    if ((this.homey.settings.get('outdoorSources') ?? null) === null) {
      this.homey.settings.set(
        'outdoorSources',
        Object.fromEntries(
          this.#melcloudDevices.map(({ id }) => [id, legacyPath]),
        ),
      )
    }
    this.homey.settings.unset('capabilityPath')
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
