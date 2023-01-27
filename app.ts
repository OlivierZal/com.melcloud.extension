import { HomeyAPIApp } from 'homey-api'
import { App } from 'homey'
import {
  type MELCloudDriverId,
  type OutdoorTemperatureListenerForAtaData
} from './types'

export default class MELCloudExtensionApp extends App {
  api!: HomeyAPIApp
  melCloudDriverIds!: MELCloudDriverId[]
  melCloudDevices!: any
  device!: any
  listener!: any

  async onInit (): Promise<void> {
    // @ts-expect-error bug
    this.api = new HomeyAPIApp({ homey: this.homey })
    // @ts-expect-error bug
    await this.api.devices.connect()

    this.melCloudDriverIds = ['melcloud', 'melcloud_atw']
    this.melCloudDevices = {}
    await this.retrieveDevices()

    this.device = null
    this.listener = null
    await this.listenToOutdoorTemperatureForAta().catch(this.error)
  }

  async retrieveDevices (
    driverId?: MELCloudDriverId,
    // @ts-expect-error bug
    fromDevices = Object.values(this.api.devices.getDevices())
  ): Promise<any[]> {
    this.melCloudDevices = fromDevices.filter((device: any): boolean =>
      this.melCloudDriverIds.includes(device.driverId)
    )
    return this.getDevices(driverId)
  }

  getDevices (driverId?: MELCloudDriverId): any[] {
    if (driverId !== undefined) {
      return this.melCloudDevices.filter(
        (device: any): boolean => device.driverId === driverId
      )
    }
    return this.melCloudDevices
  }

  async listenToOutdoorTemperatureForAta (
    {
      capabilityPath,
      enabled,
      threshold
    }: OutdoorTemperatureListenerForAtaData = {
      capabilityPath: this.homey.settings.get('capabilityPath') ?? '',
      enabled: this.homey.settings.get('enabled') ?? false,
      threshold: this.homey.settings.get('threshold') ?? 0
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
    if (this.homey.settings.get('enabled') === false) {
      return
    }
    this.log(
      'Listening to outdoor temperature: listener has been created for',
      this.device.name,
      '-',
      capability,
      '...'
    )
    this.listener = this.device.makeCapabilityInstance(
      'onoff',
      async (value: number): Promise<void> => {
        this.log(
          'Listening to outdoor temperature:',
          value,
          'listened from',
          this.device.name,
          '-',
          capability
        )
        for (const ataDevice of this.getDevices('melcloud')) {
          if (ataDevice.capabilitiesObj?.operation_mode?.value !== 'cool') {
            continue
          }
          await ataDevice.setCapabilityValue(
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
  }: OutdoorTemperatureListenerForAtaData): Promise<string> {
    try {
      this.setSettings({ threshold })
      const splitCapabilityPath: string[] = capabilityPath.split(':')
      if (splitCapabilityPath.length !== 2) {
        throw new Error('The selected outdoor temperature is invalid.')
      }
      const [id, capability]: string[] = splitCapabilityPath
      // @ts-expect-error bug
      const device = await this.api.devices.getDevice({ id })
      if (device.id !== this.device?.id) {
        this.device = device
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
    if (this.listener !== null) {
      this.listener.destroy()
    }
    if (this.device !== null) {
      this.device.io = null
    }
    this.log('Listening to outdoor temperature: listener has been cleaned')
  }

  setSettings (settings: Partial<OutdoorTemperatureListenerForAtaData>): void {
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
