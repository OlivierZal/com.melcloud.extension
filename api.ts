import type Homey from 'homey/lib/Homey'

import type MELCloudExtensionApp from '.'

import {
  type Capability,
  type TemperatureListenerData,
  type TemperatureSensor,
  MEASURE_TEMPERATURE,
  OUTDOOR_TEMPERATURE,
} from './types'

class AtaDeviceNotFoundError extends Error {
  public constructor() {
    super('no_ata_device')
  }
}

export = {
  async autoAdjustCooling({
    body,
    homey,
  }: {
    body: TemperatureListenerData
    homey: Homey
  }): Promise<void> {
    await (homey.app as MELCloudExtensionApp).autoAdjustCooling(body)
  },
  getLanguage({ homey }: { homey: Homey }): string {
    return homey.i18n.getLanguage()
  },
  getTemperatureSensors({ homey }: { homey: Homey }): TemperatureSensor[] {
    const app = homey.app as MELCloudExtensionApp
    if (!app.melcloudDevices.length) {
      throw new AtaDeviceNotFoundError()
    }
    return app.temperatureSensors
      .flatMap((device) => {
        const capabilities = Object.values(
          // @ts-expect-error: `homey-api` is partially typed
          (device.capabilitiesObj as Record<string, Capability> | null) ?? {},
        ).filter(({ id }) => id.startsWith(MEASURE_TEMPERATURE))
        const outdoorCapability = capabilities.find(
          ({ id }) =>
            app.melcloudDevices.includes(device) && id === OUTDOOR_TEMPERATURE,
        )
        if (outdoorCapability) {
          return [
            {
              capabilityName: `${device.name} - ${outdoorCapability.title}`,
              capabilityPath: `${device.id}:${outdoorCapability.id}`,
            } satisfies TemperatureSensor,
          ]
        }
        return capabilities.map(
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
