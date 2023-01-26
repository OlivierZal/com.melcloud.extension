import { HomeyAPIApp } from 'homey-api'
import { App } from 'homey'
import { type OutdoorTemperatureListenerData } from './types'

export default class MELCloudExtensionApp extends App {
  api!: HomeyAPIApp | null
  outdoorTemperatureDevice!: any
  outdoorTemperatureListener!: any

  async onInit (): Promise<void> {
    // @ts-expect-error bug
    this.api = new HomeyAPIApp({ homey: this.homey })
    // @ts-expect-error bug
    await this.api.devices.connect()
    await this.listenToOutdoorTemperatureForAta().catch(this.error)
  }

  async listenToOutdoorTemperatureForAta (
    { capabilityPath, enabled, threshold }: OutdoorTemperatureListenerData = {
      capabilityPath:
        this.homey.settings.get('outdoor_temperature_capability_path') ?? '',
      enabled: this.homey.settings.get('self_adjust_enabled') ?? false,
      threshold: this.homey.settings.get('self_adjust_threshold') ?? 0
    }
  ): Promise<void> {
    if (enabled && (capabilityPath === '' || threshold === 0)) {
      throw new Error('Outdoor temperature and/or threshold are missing.')
    }
    const capability: string = await this.handleOutdoorTemperatureListenerData({
      capabilityPath,
      enabled,
      threshold
    })
    if (this.homey.settings.get('self_adjust_enabled') === false) {
      return
    }
    this.log(
      'Listening to outdoor temperature: listener has been created for',
      this.outdoorTemperatureDevice.name,
      '-',
      capability,
      '...'
    )
    this.outdoorTemperatureListener =
      this.outdoorTemperatureDevice.makeCapabilityInstance(
        capability,
        async (value: number): Promise<void> => {
          this.log(
            'Listening to outdoor temperature:',
            value,
            'listened from',
            this.outdoorTemperatureDevice.name,
            '-',
            capability
          )
          for (const device of this.getDevices({ driverId: 'melcloud' })) {
            if (device.getCapabilityValue('operation_mode') !== 'cool') {
              continue
            }
            await device.onCapability(
              'target_temperature',
              Math.max(threshold, Math.round(value - 8), 38)
            )
          }
        }
      )
  }

  async handleOutdoorTemperatureListenerData ({
    capabilityPath,
    enabled,
    threshold
  }: OutdoorTemperatureListenerData): Promise<string> {
    try {
      this.setSettings({ threshold })
      const splitCapabilityPath: string[] = capabilityPath.split(':')
      if (splitCapabilityPath.length !== 2) {
        throw new Error('The selected outdoor temperature is invalid.')
      }
      const [id, capability]: string[] = splitCapabilityPath
      // @ts-expect-error bug
      const device = await this.api.devices.getDevice({ id })
      if (device.id !== this.outdoorTemperatureDevice?.id) {
        this.outdoorTemperatureDevice = device
      }
      if (!(capability in device.capabilitiesObj)) {
        throw new Error(
          `${capability} cannot be found on ${device.name as string}.`
        )
      }
      this.setSettings({
        capabilityPath,
        enabled
      })
      return capability
    } catch (error: unknown) {
      this.error(
        'Listening to outdoor temperature:',
        error instanceof Error ? error.message : error
      )
      this.setSettings({
        capabilityPath: '',
        enabled: false
      })
      if (capabilityPath !== '') {
        throw error
      }
      return ''
    } finally {
      this.cleanOutdoorTemperatureListener()
    }
  }

  cleanOutdoorTemperatureListener (): void {
    if (this.outdoorTemperatureListener !== null) {
      this.outdoorTemperatureListener.destroy()
    }
    if (this.outdoorTemperatureDevice !== null) {
      this.outdoorTemperatureDevice.io = null
    }
    this.log('Listening to outdoor temperature: listener has been cleaned')
  }


  setSettings (settings: Partial<OutdoorTemperatureListenerData>): void {
    for (const [setting, value] of Object.entries(settings)) {
      if (value !== this.homey.settings.get(setting)) {
        this.homey.settings.set(setting, value)
      }
    }
  }

  async onUninit (): Promise<void> {
    this.cleanOutdoorTemperatureListener()
  }
}

module.exports = MELCloudExtensionApp
