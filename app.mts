import type ApiApp from 'homey/lib/ApiApp'
import {
  fireAndForget,
  getErrorMessage,
  selectChangelogEntries,
  sequential,
} from '@olivierzal/homey-kit'
import { HomeyAPIV3Local } from 'homey-api'
import { Temporal } from 'temporal-polyfill'

import type { OutdoorSource } from './listeners/outdoor-source.mts'
import { changelog } from './files.mts'
import { toJoinKey } from './lib/group-devices.mts'
import { type Homey, App } from './lib/homey.mts'
import { toDeviceGroups } from './lib/to-device-groups.mts'
import { toListenerData } from './lib/to-listener-data.mts'
import { toOutdoorSources } from './lib/to-outdoor-sources.mts'
import { toThresholds } from './lib/to-thresholds.mts'
import { toTimestampedLogs } from './lib/to-timestamped-logs.mts'
import { CapabilityOutdoorSource } from './listeners/capability-source.mts'
import { ListenerError } from './listeners/error.mts'
import { MELCloudListener } from './listeners/melcloud.mts'
import { WeatherOutdoorSource } from './listeners/weather-source.mts'
import {
  type DeviceGroups,
  type ListenerParams,
  type Names,
  type OutdoorSources,
  type TemperatureListenerData,
  type Thresholds,
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

  // Sanitized and fresh on every read: a corrupt entry reads as absent,
  // and callers may mutate the result without touching the store. The
  // accessor pair is the only door to each key, so the key name and its
  // sanitizer sit together instead of being restated at every site —
  // and a caller cannot write past the contract its reader assumes.
  public get outdoorSources(): OutdoorSources {
    return toOutdoorSources(this.homey.settings.get('outdoorSources')) ?? {}
  }

  public set outdoorSources(value: OutdoorSources) {
    this.homey.settings.set('outdoorSources', value)
  }

  public get temperatureSensors(): HomeyAPIV3Local.ManagerDevices.Device[] {
    return this.#temperatureSensors
  }

  public get thresholds(): Thresholds {
    return toThresholds(this.homey.settings.get('thresholds')) ?? {}
  }

  public set thresholds(value: Thresholds) {
    this.homey.settings.set('thresholds', value)
  }

  #api!: HomeyAPIV3Local

  #deviceGroups: DeviceGroups | null = null

  readonly #deviceListeners: MELCloudListener[] = []

  #initTimeout: NodeJS.Timeout | null = null

  #melcloudApp!: ApiApp

  readonly #melcloudDevices: HomeyAPIV3Local.ManagerDevices.Device[] = []

  // Keyed by source path, memoizing the IN-FLIGHT creation (not the
  // result): devices of one building fan out concurrently and must
  // share a single watcher per sensor, so the promise lands in the map
  // synchronously, before the first await.
  readonly #sources = new Map<string, Promise<OutdoorSource>>()

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
      fireAndForget(
        this.#destroyListeners(),
        this,
        'Failed to destroy listeners',
      )
    })
    this.#createNotification()
    // Poke any open webview to re-run its freshness handshake: an app
    // (re)boot is exactly when the served hashes may have moved.
    this.homey.api.realtime('webview_hashes_changed', null)
  }

  public override async onUninit(): Promise<void> {
    await this.#destroyListeners()
  }

  // Starts or restarts automatic cooling adjustment. A device whose
  // source fails to validate is reported and skipped; the others keep
  // running.
  public async autoAdjustCooling(payload?: unknown): Promise<void> {
    const { isEnabled, outdoorSources } =
      payload === undefined
        ? this.#getStoredListenerData()
        : toListenerData(payload)
    await this.#destroyListeners()
    this.homey.settings.set('isEnabled', isEnabled)
    // Merged, never replaced: the settings page builds this payload from
    // the devices it DISPLAYED, so a partial device list would drop the
    // entries of the others. Merging is also the whole truth about this
    // map — no key is ever legitimately removed (disabling a source is a
    // value, `DISABLED_SOURCE`, not an absent entry), which is the same
    // reason orphan entries are left alone.
    this.outdoorSources = { ...this.outdoorSources, ...outdoorSources }
    if (!isEnabled) {
      return
    }
    // The restart routes from the merged map for the same reason: a
    // device the payload omits keeps its stored source instead of
    // falling back to Homey weather — or restarting at all, when the
    // store disables it.
    const sources = this.outdoorSources
    await Promise.all(
      this.#melcloudDevices
        .filter(({ id }) => sources[id] !== DISABLED_SOURCE)
        .map(async (device) =>
          this.#listenToDevice(device, sources[device.id] ?? null),
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
        .replaceAll(/de el /giu, 'del ')
        .replaceAll(/de le /giu, 'du '),
      time: Temporal.Now.instant().epochMilliseconds,
    }
    this.homey.api.realtime('log', newLog)
    this.#persistLog(newLog)
  }

  // Building grouping served by com.melcloud's inter-app API; anything
  // off (older app version, not installed, bad payload) reads as "no
  // grouping" and the settings fall back to the per-device list.
  // Re-read on demand — a memory-served lookup in com.melcloud since
  // 45.2.0 — so the settings page follows building renames without an
  // app restart.
  public async refreshDeviceGroups(): Promise<DeviceGroups | null> {
    this.#deviceGroups = await this.#fetchDeviceGroups()
    return this.#deviceGroups
  }

  #createNotification(): void {
    const { homey } = this
    const {
      manifest: { version },
      notifications,
      settings,
    } = homey
    // Every release since the one already announced, not just the
    // running one: a user who updates rarely would otherwise never hear
    // about the versions in between. The SDK read is untyped, as
    // everywhere else settings are read: a stored value that is not a
    // string reads as no baseline at all.
    const notified: unknown = settings.get('notifiedVersion')
    const { entries } = selectChangelogEntries({
      changelog,
      from: typeof notified === 'string' ? notified : null,
      language: homey.i18n.getLanguage(),
      to: version,
    })
    if (entries.length === 0) {
      return
    }
    homey.setTimeout(async () => {
      try {
        await sequential(entries, async ({ excerpt }) => {
          await notifications.createNotification({ excerpt })
        })
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
    await Promise.all(
      this.#sources.values().map(async (source) => {
        try {
          const settled = await source
          settled.destroy()
        } catch {
          // A source that never materialized has nothing to destroy.
        }
      }),
    )
    this.#sources.clear()
  }

  async #fetchDeviceGroups(): Promise<DeviceGroups | null> {
    try {
      const payload: unknown = await this.#melcloudApp.get('/devices/groups')
      return toDeviceGroups(payload)
    } catch {
      return null
    }
  }

  // Bridges the two id spaces: the building payload speaks MELCloud
  // ids, every settings map is keyed by Homey id.
  #getHomeyIdByMelcloudId(): Map<string, string> {
    return new Map(
      this.#melcloudDevices.flatMap((device) => {
        const melcloudId = toJoinKey(device.data.id)
        return melcloudId === null ? [] : [[melcloudId, device.id] as const]
      }),
    )
  }

  async #getSource(sourcePath: string | null): Promise<OutdoorSource> {
    const key = sourcePath ?? WEATHER_SOURCE_KEY
    const existing = this.#sources.get(key)
    if (existing !== undefined) {
      return existing
    }
    const source = (async (): Promise<OutdoorSource> => {
      if (sourcePath === null) {
        return new WeatherOutdoorSource(this)
      }
      try {
        return await CapabilityOutdoorSource.create(this, sourcePath)
      } catch (error) {
        // A failed creation must not stay cached: the next lookup
        // retries.
        this.#sources.delete(key)
        throw error
      }
    })()
    this.#sources.set(key, source)
    return source
  }

  #getStoredListenerData(): TemperatureListenerData {
    return {
      isEnabled: this.homey.settings.get('isEnabled') === true,
      outdoorSources: this.outdoorSources,
    }
  }

  // Newcomers inherit their building's outdoor source when the
  // siblings agree; a new building (or a mixed/ungrouped one) starts
  // disabled so no device gets auto-adjusted without an opt-in.
  //
  // Two id spaces meet here and must not be confused: the settings map
  // is keyed by HOMEY device id, while the building payload lists
  // MELCLOUD ids. Each device carries its MELCloud id in `data.id` —
  // the same join `groupAdjustableDevices` uses — so comparing the two
  // spaces directly never matched and every newcomer silently fell
  // through to DISABLED_SOURCE.
  #inheritedSource(
    device: HomeyAPIV3Local.ManagerDevices.Device,
    stored: OutdoorSources,
    homeyIdByMelcloudId: ReadonlyMap<string, string>,
  ): string | null {
    const melcloudId = toJoinKey(device.data.id)
    const group =
      melcloudId === null
        ? undefined
        : this.#deviceGroups?.find(({ deviceIds }) =>
            deviceIds.includes(melcloudId),
          )
    const siblingSources = new Set(
      (group?.deviceIds ?? [])
        .filter((id) => id !== melcloudId)
        .map((id) => homeyIdByMelcloudId.get(id))
        .filter(
          (id): id is string => id !== undefined && Object.hasOwn(stored, id),
        )
        .map((id) => stored[id] ?? null),
    )
    if (siblingSources.size !== 1) {
      return DISABLED_SOURCE
    }
    const [shared = null] = siblingSources
    return shared
  }

  // Debounces device list reload: rapid device.create/delete events
  // are coalesced into a single init after INIT_DELAY. The timer body
  // routes through fireAndForget: the SDK invokes it bare, so a
  // rejection would otherwise terminate the app process.
  #init(): void {
    this.homey.clearTimeout(this.#initTimeout)
    this.#initTimeout = this.homey.setTimeout(() => {
      fireAndForget(
        (async (): Promise<void> => {
          await this.#loadDevices()
          await this.autoAdjustCooling()
        })(),
        this,
        'Failed to reload devices',
      )
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
  // sensors.
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
    await this.refreshDeviceGroups()
    this.#reconcileSourceEntries()
  }

  // Older versions stored one global outdoor source: seed every known AC
  // device with it once, then drop the legacy key.
  #migrateLegacySource(): void {
    const legacyPath = this.homey.settings.get('capabilityPath')
    if (typeof legacyPath !== 'string') {
      return
    }
    // The one raw read: it needs "nothing stored" (never migrated)
    // distinguished from "an empty map was stored", which the getter's
    // `?? {}` would flatten. A garbage value now also reads as not yet
    // migrated, which is the right call.
    if (toOutdoorSources(this.homey.settings.get('outdoorSources')) === null) {
      this.outdoorSources = Object.fromEntries(
        this.#melcloudDevices.map(({ id }) => [id, legacyPath]),
      )
    }
    this.homey.settings.unset('capabilityPath')
  }

  #persistLog(newLog: TimestampedLog): void {
    const lastLogs =
      toTimestampedLogs(this.homey.settings.get('lastLogs')) ?? []
    this.homey.settings.set(
      'lastLogs',
      [newLog, ...lastLogs].slice(0, MAX_LOGS),
    )
  }

  // Brings the per-device source entries in line with the freshly
  // loaded device set: the legacy single-source form migrates first so
  // seeding sees its result, and newcomers start disabled (opt-in).
  #reconcileSourceEntries(): void {
    this.#migrateLegacySource()
    this.#seedOutdoorSources()
  }

  // Every known AC device gets an EXPLICIT outdoor-source entry, so a
  // device appearing later is distinguishable from one whose entry was
  // never written. The first seeding on an existing install stamps the
  // legacy default (null = Homey weather) and changes nothing;
  // afterwards newcomers go through #inheritedSource.
  #seedOutdoorSources(): void {
    const stored: OutdoorSources = this.outdoorSources
    const newcomers = this.#melcloudDevices.filter(
      ({ id }) => !Object.hasOwn(stored, id),
    )
    const isLegacySeed =
      this.homey.settings.get('hasSeededOutdoorSources') !== true
    this.#writeNewcomerEntries(stored, newcomers, isLegacySeed)
    if (newcomers.length > 0) {
      this.outdoorSources = stored
    }
    if (isLegacySeed) {
      this.homey.settings.set('hasSeededOutdoorSources', true)
    }
  }

  // The sibling vote reads a pre-seed snapshot, never the map being
  // written: only entries that predate this reconciliation — user
  // decisions and past seeds — may decide a newcomer, so one
  // newcomer's inferred value cannot leak into another's vote. The
  // first (legacy) seed stamps the historical default instead.
  #writeNewcomerEntries(
    stored: OutdoorSources,
    newcomers: readonly HomeyAPIV3Local.ManagerDevices.Device[],
    isLegacySeed: boolean,
  ): void {
    const homeyIdByMelcloudId = this.#getHomeyIdByMelcloudId()
    const decided: OutdoorSources = { ...stored }
    for (const device of newcomers) {
      stored[device.id] = isLegacySeed
        ? null
        : this.#inheritedSource(device, decided, homeyIdByMelcloudId)
    }
  }
}
