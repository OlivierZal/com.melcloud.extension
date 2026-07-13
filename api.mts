import type { Homey } from 'homey/lib/Homey'

import { NotFoundError } from './lib/errors.mts'
import {
  type TemperatureListenerData,
  type TemperatureSensor,
  MEASURE_TEMPERATURE,
  OUTDOOR_TEMPERATURE,
} from './types.mts'

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
   * Reads the language configured on the Homey.
   * @param options - Homey API context.
   * @param options.homey - Homey instance carrying the i18n manager.
   * @returns The BCP-47 language tag (e.g. `en`, `fr`).
   */
  getLanguage({ homey: { i18n } }: { homey: Homey }): string {
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
