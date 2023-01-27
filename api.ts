import type Homey from 'homey/lib/Homey'
import type MELCloudExtensionApp from './app'
import {
  type MELCloudDriverId,
  type OutdoorTemperatureListenerForAtaData
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
  async getMeasureTemperatureCapabilitiesForAta ({ homey }: { homey: Homey }) {
    const app: MELCloudExtensionApp = homey.app as MELCloudExtensionApp
    const capabilityId: string = 'measure_temperature'
    const driverId: MELCloudDriverId = 'melcloud'
    // @ts-expect-error bug
    const devices = Object.values(await app.api.devices.getDevices())
    return devices
      .filter(
        (device: any): boolean =>
          device.driverId !== driverId &&
          device.capabilities.some((capability: string): boolean =>
            capability.startsWith(capabilityId)
          )
      )
      .map((device: any) =>
        Object.values(device.capabilitiesObj)
          .filter((capabilitiesObj: any): boolean =>
            capabilitiesObj.id.startsWith(capabilityId)
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
    body: OutdoorTemperatureListenerForAtaData
  }): Promise<void> {
    await (homey.app as MELCloudExtensionApp).listenToOutdoorTemperatureForAta(
      body
    )
  }
}
