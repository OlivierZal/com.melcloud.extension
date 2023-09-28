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
      await app.loadDevices()
    if (!app.melCloudDevices.length) {
      throw new Error('no_device_ata')
    }
    return measureTemperatureDevices
      .flatMap(
        (
          device: HomeyAPIV3Local.ManagerDevices.Device,
        ): MeasureTemperatureDevice[] =>
          Object.values(
            // @ts-expect-error: homey-api is partially typed
            (device.capabilitiesObj as Record<
              string,
              { id: string; title: string }
            > | null) ?? {},
          )
            .filter(({ id }) => id.startsWith('measure_temperature'))
            .map(
              ({ id, title }): MeasureTemperatureDevice => ({
                capabilityPath: `${device.id}:${id}`,
                capabilityName: `${device.name} - ${title}`,
              }),
            ),
      )
      .sort(
        (
          device1: MeasureTemperatureDevice,
          device2: MeasureTemperatureDevice,
        ) => device1.capabilityName.localeCompare(device2.capabilityName),
      )
  },
}
