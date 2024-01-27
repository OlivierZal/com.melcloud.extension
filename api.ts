import type { TemperatureListenerData, TemperatureSensor } from './types'
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
    if (!app.melCloudDevices.length) {
      throw new Error('no_device_ata')
    }
    return app.temperatureSensors
      .flatMap(
        (device: HomeyAPIV3Local.ManagerDevices.Device): TemperatureSensor[] =>
          Object.values(
            // @ts-expect-error: `homey-api` is partially typed
            (device.capabilitiesObj as Record<
              string,
              { id: string; title: string }
            > | null) ?? {},
          )
            .filter(({ id }) => id.startsWith('measure_temperature'))
            .map(
              ({ id, title }): TemperatureSensor => ({
                capabilityName: `${device.name} - ${title}`,
                capabilityPath: `${device.id}:${id}`,
              }),
            ),
      )
      .sort((device1: TemperatureSensor, device2: TemperatureSensor) =>
        device1.capabilityName.localeCompare(device2.capabilityName),
      )
  },
}
