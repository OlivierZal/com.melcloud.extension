import type Homey from 'homey/lib/Homey'
import type MELCloudExtensionApp from './app'
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
  async getMeasureTemperatureDevices ({ homey }: { homey: Homey }) {
    const app: MELCloudExtensionApp = homey.app as MELCloudExtensionApp
    const capabilityId: string = 'measure_temperature'
    const devices = await app.refreshMelCloudDevicesAndGetExternalDevices()
    if (app.melCloudDevices.length === 0) {
      throw new Error('no_device')
    }
    return devices
      .filter((device: any): boolean =>
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

  async selfAdjustCooling ({
    homey,
    body
  }: {
    homey: Homey
    body: OutdoorTemperatureListenerData
  }): Promise<void> {
    await (homey.app as MELCloudExtensionApp).listenToOutdoorTemperature(body)
  }
}
