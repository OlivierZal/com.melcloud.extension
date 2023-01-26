import type Homey from 'homey/lib/Homey'
import type MELCloudAppExtension from './app'
import { type OutdoorTemperatureListenerData } from './types'

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
  async getMeasureTemperatureCapabilitiesForAta ({ homey }: { homey: Homey }) {
    const app: MELCloudAppExtension = homey.app as MELCloudAppExtension
    const driverId: string = 'melcloud'
    if (app.getDevices({ driverId }).length === 0) {
      return []
    }
    // @ts-expect-error bug
    const devices = await app.api.devices.getDevices()
    return Object.values(devices)
      .filter(
        (device: any): boolean =>
          device.driverId !== driverId &&
          device.capabilities.some((capability: string): boolean =>
            capability.startsWith('measure_temperature')
          )
      )
      .map((device: any) =>
        Object.values(device.capabilitiesObj)
          .filter((capabilitiesObj: any): boolean =>
            capabilitiesObj.id.startsWith('measure_temperature')
          )
          .map((capabilityObj: any) => ({
            capabilityPath: `${device.id as string}:${
              capabilityObj.id as string
            }`,
            capabilityName: `${device.name as string} - ${
              capabilityObj.title as string
            }`
          }))
      )
      .flat()
      .sort((device1: any, device2: any): -1 | 0 | 1 =>
        sortByAlphabeticalOrder(device1.capabilityName, device2.capabilityName)
      )
  },

  async listenToOutdoorTemperatureForAta ({
    homey,
    body
  }: {
    homey: Homey
    body: OutdoorTemperatureListenerData
  }): Promise<void> {
    await (homey.app as MELCloudAppExtension).listenToOutdoorTemperatureForAta(
      body
    )
  }
}
