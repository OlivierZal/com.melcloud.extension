import type {
  Capability,
  CapabilityPath,
  TemperatureListenerData,
  TemperatureSensor,
} from './types'
import type Homey from 'homey/lib/Homey'
import type MELCloudExtensionApp from './app'

export = {
  async autoAdjustCooling({
    homey,
    body,
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
      throw new Error('no_device_ata')
    }
    return app.temperatureSensors
      .flatMap((device) => {
        const capabilities = Object.values(
          // @ts-expect-error: `homey-api` is partially typed
          (device.capabilitiesObj as Record<string, Capability> | null) ?? {},
        ).filter(({ id }) => id.startsWith('measure_temperature'))
        const outdoorCapability = capabilities.find(
          ({ id }) =>
            app.melcloudDevices.includes(device) &&
            id === 'measure_temperature.outdoor',
        )
        if (outdoorCapability) {
          const capabilityPath: CapabilityPath = `${device.id}:${outdoorCapability.id}`
          if (homey.settings.get('capabilityPath') === null) {
            homey.settings.set('capabilityPath', capabilityPath)
          }
          return [
            {
              capabilityName: `${device.name} - ${outdoorCapability.title}`,
              capabilityPath,
            },
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
