import { type HomeyAPIV2 } from 'homey-api'
import type Homey from 'homey/lib/Homey'
import type MELCloudExtensionApp from './app'
import {
  type MeasureTemperatureDevice,
  type OutdoorTemperatureListenerData
} from './types'

function sortByAlphabeticalOrder (value1: string, value2: string): -1 | 0 | 1 {
  if (value1 < value2) {
    return -1
  }
  if (value1 > value2) {
    return 1
  }
  return 0
}

module.exports = {
  async getMeasureTemperatureDevicesAta ({
    homey
  }: {
    homey: Homey
  }): Promise<MeasureTemperatureDevice[]> {
    const app: MELCloudExtensionApp = homey.app as MELCloudExtensionApp
    const capabilityId: string = 'measure_temperature'
    const devices: HomeyAPIV2.ManagerDevices.Device[] =
      await app.refreshMelCloudDevicesAndGetExternalDevices()
    if (app.melCloudDevices.length === 0) {
      throw new Error('no_device')
    }
    return devices
      .filter((device: HomeyAPIV2.ManagerDevices.Device): boolean =>
        device.capabilities.some((capability: string): boolean =>
          capability.startsWith(capabilityId)
        )
      )
      .map(
        (
          device: HomeyAPIV2.ManagerDevices.Device
        ): MeasureTemperatureDevice[] =>
          Object.values(device.capabilitiesObj)
            .filter((capabilityObj): boolean =>
              capabilityObj.id.startsWith(capabilityId)
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
      .flat()
      .sort(
        (
          device1: MeasureTemperatureDevice,
          device2: MeasureTemperatureDevice
        ): -1 | 0 | 1 =>
          sortByAlphabeticalOrder(
            device1.capabilityName,
            device2.capabilityName
          )
      )
  },

  async selfAdjustCoolingAta ({
    homey,
    body
  }: {
    homey: Homey
    body: OutdoorTemperatureListenerData
  }): Promise<void> {
    await (homey.app as MELCloudExtensionApp).selfAdjustCoolingAta(body)
  }
}
