import type { HomeyAPIV3Local } from 'homey-api'
import type Homey from 'homey/lib/Homey'
import type MELCloudExtensionApp from './app'
import type { MeasureTemperatureDevice, TemperatureListenerData } from './types'

export = {
  async autoAdjustCoolingAta({
    homey,
    body,
  }: {
    body: TemperatureListenerData
    homey: Homey
  }): Promise<void> {
    await (homey.app as MELCloudExtensionApp).autoAdjustCoolingAta(body)
  },
  getLanguage({ homey }: { homey: Homey }): string {
    return homey.i18n.getLanguage()
  },
  async getMeasureTemperatureDevicesAta({
    homey,
  }: {
    homey: Homey
  }): Promise<MeasureTemperatureDevice[]> {
    const app: MELCloudExtensionApp = homey.app as MELCloudExtensionApp
    const measureTemperatureDevices: HomeyAPIV3Local.ManagerDevices.Device[] =
      await app.refreshDevices()
    if (app.melCloudDevices.length === 0) {
      throw new Error('no_device_ata')
    }
    return measureTemperatureDevices
      .flatMap(
        (
          device: HomeyAPIV3Local.ManagerDevices.Device
        ): MeasureTemperatureDevice[] =>
          // @ts-expect-error bug
          Object.values(device.capabilitiesObj ?? {})
            .filter(
              (capability): capability is { id: string; title: string } =>
                capability !== null &&
                typeof capability === 'object' &&
                'id' in capability &&
                typeof capability.id === 'string' &&
                'title' in capability &&
                typeof capability.title === 'string'
            )
            .filter(({ id }) => id.startsWith('measure_temperature'))
            .map(
              ({ id, title }): MeasureTemperatureDevice => ({
                capabilityPath: `${device.id}:${id}`,
                capabilityName: `${device.name} - ${title}`,
              })
            )
      )
      .sort(
        (
          device1: MeasureTemperatureDevice,
          device2: MeasureTemperatureDevice
        ) => device1.capabilityName.localeCompare(device2.capabilityName)
      )
  },
}
