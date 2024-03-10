import type {
  Capability,
  TemperatureListenerData,
  TemperatureSensor,
} from './types'
import type Homey from 'homey/lib/Homey'
import type { HomeyAPIV3Local } from 'homey-api'
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
    const app: MELCloudExtensionApp = homey.app as MELCloudExtensionApp
    if (!app.melcloudDevices.length) {
      throw new Error('no_device_ata')
    }
    return app.temperatureSensors
      .flatMap(
        (
          device: HomeyAPIV3Local.ManagerDevices.Device,
        ): TemperatureSensor[] => {
          const capabilities: Capability[] = Object.values(
            // @ts-expect-error: `homey-api` is partially typed
            (device.capabilitiesObj as Record<string, Capability> | null) ?? {},
          ).filter(({ id }) => id.startsWith('measure_temperature'))
          const outdoorCapability: Capability | undefined = capabilities.find(
            ({ id }) =>
              app.melcloudDevices.includes(device) &&
              id === 'measure_temperature.outdoor',
          )
          if (outdoorCapability) {
            const capabilityPath = `${device.id}:${outdoorCapability.id}`
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
        },
      )
      .sort((device1: TemperatureSensor, device2: TemperatureSensor) =>
        device1.capabilityName.localeCompare(device2.capabilityName),
      )
  },
}
