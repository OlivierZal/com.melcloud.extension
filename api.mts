import type { Homey } from 'homey/lib/Homey'

import { NotFoundError } from './lib/errors.mts'
import { groupAdjustableDevices } from './lib/group-devices.mts'
import {
  type AdjustableGroup,
  type TemperatureListenerData,
  type TemperatureSensor,
  MEASURE_TEMPERATURE,
  OUTDOOR_TEMPERATURE,
} from './types.mts'

// Diagnostics breadcrumb: the settings webview is otherwise invisible in
// diagnostic reports (its routes are all local IPC / inter-app reads, no
// MELCloud round-trip to log), which would make "settings fail to load"
// reports undecidable — no line = the page's JS never ran; lines without
// a completed sequence = where it stopped. Mirrors com.melcloud.
const logSettingsRoute = (app: Homey['app'], route: string): void => {
  app.log({ dataType: 'Settings page', route })
}

const api = {
  /**
   * Starts or restarts automatic cooling adjustment from the settings UI.
   * @param options - Homey API context.
   * @param options.body - Selected outdoor source and enablement flag.
   * @param options.homey - Homey instance carrying the app.
   */
  async autoAdjustCooling({
    body,
    homey: { app },
  }: {
    body: TemperatureListenerData
    homey: Homey
  }): Promise<void> {
    await app.autoAdjustCooling(body)
  },
  /**
   * Lists the settings rows: one named group per MELCloud building
   * (com.melcloud's inter-app grouping), unmatched devices trailing in
   * an unnamed group, or a single unnamed flat group when no grouping
   * is available. The grouping is re-read from com.melcloud on every
   * call (a memory-served lookup there since 45.2.0), so a building
   * rename shows up on the next settings refresh. Devices carry their
   * configured outdoor source (`null` when they follow the Homey
   * weather default).
   * @param options - Homey API context.
   * @param options.homey - Homey instance carrying the app.
   * @returns The groups, sorted by name, devices sorted within.
   * @throws NotFoundError when no MELCloud AC device is paired yet.
   */
  async getAdjustableGroups({
    homey,
  }: {
    homey: Homey
  }): Promise<AdjustableGroup[]> {
    const { app } = homey
    logSettingsRoute(app, '/devices/groups')
    if (app.melcloudDevices.length === 0) {
      throw new NotFoundError()
    }
    return groupAdjustableDevices(
      app.melcloudDevices,
      app.homey.settings.get('outdoorSources') ?? {},
      await app.refreshDeviceGroups(),
    )
  },
  /**
   * Reads the language configured on the Homey.
   * @param options - Homey API context.
   * @param options.homey - Homey instance carrying the i18n manager.
   * @returns The BCP-47 language tag (e.g. `en`, `fr`).
   */
  getLanguage: ({ homey: { app, i18n } }: { homey: Homey }): string => {
    logSettingsRoute(app, '/language')
    return i18n.getLanguage()
  },
  /**
   * Lists the temperature capabilities selectable as outdoor source,
   * sorted by display name. MELCloud AC devices only expose their
   * outdoor temperature (when they report one): their indoor readings
   * are adjustment targets, not sensor candidates.
   * @param options - Homey API context.
   * @param options.homey - Homey instance carrying the app.
   * @returns The selectable sensors.
   * @throws NotFoundError when no MELCloud AC device is paired yet.
   */
  getTemperatureSensors({ homey }: { homey: Homey }): TemperatureSensor[] {
    const { melcloudDevices, temperatureSensors } = homey.app
    logSettingsRoute(homey.app, '/devices/sensors/temperature')
    if (melcloudDevices.length === 0) {
      throw new NotFoundError()
    }
    return temperatureSensors
      .flatMap((device) => {
        const { capabilitiesObj, id: deviceId, name: deviceName } = device
        const capabilities = Object.values(capabilitiesObj ?? {}).filter(
          ({ id }) => id.startsWith(MEASURE_TEMPERATURE),
        )
        const selectable =
          melcloudDevices.includes(device) ?
            capabilities.filter(({ id }) => id === OUTDOOR_TEMPERATURE)
          : capabilities
        return selectable.map(({ id, title }): TemperatureSensor => ({
          capabilityName: `${deviceName} - ${title}`,
          capabilityPath: `${deviceId}:${id}`,
        }))
      })
      .toSorted((sensor1, sensor2) =>
        sensor1.capabilityName.localeCompare(sensor2.capabilityName),
      )
  },
}

export default api
