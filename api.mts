import type { Homey } from 'homey/lib/Homey'

import { LENGTH_ZERO } from './constants.mts'
import {
  type TemperatureListenerData,
  type TemperatureSensor,
  MEASURE_TEMPERATURE,
  OUTDOOR_TEMPERATURE,
} from './types.mts'

class AtaDeviceNotFoundError extends Error {
  public override name = 'AtaDeviceNotFoundError'

  public constructor() {
    super('notFound')
  }
}

const api = {
  async autoAdjustCooling({
    body,
    homey: { app },
  }: {
    body: TemperatureListenerData
    homey: Homey
  }): Promise<void> {
    await app.autoAdjustCooling(body)
  },
  getLanguage({ homey: { i18n } }: { homey: Homey }): string {
    return i18n.getLanguage()
  },
  getTemperatureSensors({
    homey: {
      app: { melcloudDevices, temperatureSensors },
    },
  }: {
    homey: Homey
  }): TemperatureSensor[] {
    if (melcloudDevices.length === LENGTH_ZERO) {
      throw new AtaDeviceNotFoundError()
    }
    return temperatureSensors
      .flatMap((device) => {
        const capabilities = Object.values(device.capabilitiesObj ?? {}).filter(
          ({ id }) => id.startsWith(MEASURE_TEMPERATURE),
        )
        const outdoorCapability = capabilities.find(
          ({ id }) =>
            melcloudDevices.includes(device) && id === OUTDOOR_TEMPERATURE,
        )
        return (outdoorCapability ? [outdoorCapability] : capabilities).map(
          ({ id, title }): TemperatureSensor => ({
            capabilityName: `${device.name} - ${title}`,
            capabilityPath: `${device.id}:${id}`,
          }),
        )
      })
      .sort((device1, device2) =>
        device1.capabilityName.localeCompare(device2.capabilityName),
      )
  },
}

export default api
