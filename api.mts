import type { Homey } from 'homey/lib/Homey'

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
    if (!melcloudDevices.length) {
      throw new AtaDeviceNotFoundError()
    }
    return temperatureSensors
      .flatMap((device) => {
        const { capabilitiesObj, id: deviceId, name: deviceName } = device
        const capabilities = Object.values(capabilitiesObj ?? {}).filter(
          ({ id }) => id.startsWith(MEASURE_TEMPERATURE),
        )
        const outdoorCapability = capabilities.find(
          ({ id }) =>
            melcloudDevices.includes(device) && id === OUTDOOR_TEMPERATURE,
        )
        return (outdoorCapability ? [outdoorCapability] : capabilities).map(
          ({ id, title }): TemperatureSensor => ({
            capabilityName: `${deviceName} - ${title}`,
            capabilityPath: `${deviceId}:${id}`,
          }),
        )
      })
      .toSorted(({ capabilityName: name1 }, { capabilityName: name2 }) =>
        name1.localeCompare(name2),
      )
  },
}

export default api
