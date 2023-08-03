import { type HomeyAPIV3Local } from 'homey-api'
import type Homey from 'homey/lib/Homey'
import type MELCloudExtensionApp from './app'
import type {
  CapabilityObj,
  MeasureTemperatureDevice,
  TemperatureListenerData,
} from './types'

export default {
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
          Object.values(device.capabilitiesObj ?? {}).reduce<
            MeasureTemperatureDevice[]
            // @ts-expect-error bug
          >((devices, capabilityObj: CapabilityObj) => {
            if (capabilityObj.id.startsWith('measure_temperature')) {
              devices.push({
                capabilityPath: `${device.id}:${capabilityObj.id}`,
                capabilityName: `${device.name} - ${capabilityObj.title}`,
              })
            }
            return devices
          }, [])
      )
      .sort(
        (
          device1: MeasureTemperatureDevice,
          device2: MeasureTemperatureDevice
        ): number =>
          device1.capabilityName.localeCompare(device2.capabilityName)
      )
  },

  async autoAdjustCoolingAta({
    homey,
    body,
  }: {
    body: TemperatureListenerData
    homey: Homey
  }): Promise<void> {
    await (homey.app as MELCloudExtensionApp).autoAdjustCoolingAta(body)
  },
}
