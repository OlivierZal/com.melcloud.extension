import { type HomeyAPIV2 } from 'homey-api'
import type Homey from 'homey/lib/Homey'
import type MELCloudExtensionApp from './app'
import {
  type MeasureTemperatureDevice,
  type OutdoorTemperatureListenerData
} from './types'

module.exports = {
  async getLanguage({ homey }: { homey: Homey }): Promise<string> {
    return (homey.app as MELCloudExtensionApp).getLanguage()
  },

  async getMeasureTemperatureDevicesAta({
    homey
  }: {
    homey: Homey
  }): Promise<MeasureTemperatureDevice[]> {
    const app: MELCloudExtensionApp = homey.app as MELCloudExtensionApp
    if (app.melCloudDevices.length === 0) {
      throw new Error('no_device_ata')
    }
    const devices: HomeyAPIV2.ManagerDevices.Device[] =
      await app.getMeasureTemperatureDevicesAta()
    return devices
      .flatMap(
        (
          device: HomeyAPIV2.ManagerDevices.Device
        ): MeasureTemperatureDevice[] =>
          Object.values(device.capabilitiesObj ?? {})
            .filter((capabilityObj): boolean =>
              capabilityObj.id.startsWith('measure_temperature')
            )
            .map(
              (capabilityObj): MeasureTemperatureDevice => ({
                capabilityPath: `${device.id}:${capabilityObj.id as string}`,
                capabilityName: `${device.name} - ${
                  capabilityObj.title as string
                }`
              })
            )
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
    body
  }: {
    homey: Homey
    body: OutdoorTemperatureListenerData
  }): Promise<void> {
    await (homey.app as MELCloudExtensionApp).autoAdjustCoolingAta(body)
  }
}
