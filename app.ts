import { HomeyAPIApp } from 'homey-api'
import { App } from 'homey'
import {
  type Listener,
  type MelCloudListener,
  type OutdoorTemperatureListenerData,
  type Settings
} from './types'

function getTargetTemperature (threshold: number, value: number): number {
  return Math.min(Math.max(threshold, Math.round(value - 8)), 38)
}

export default class MELCloudExtensionApp extends App {
  api!: HomeyAPIApp
  melCloudDevices!: any[]
  melCloudListeners!: MelCloudListener[]
  externalListener!: Partial<Listener>

  async onInit (): Promise<void> {
    // @ts-expect-error bug
    this.api = new HomeyAPIApp({ homey: this.homey })
    // @ts-expect-error bug
    await this.api.devices.connect()

    this.melCloudDevices = []
    this.melCloudListeners = []
    this.externalListener = {}
    await this.refreshMelCloudDevicesAndGetExternalDevices()
    await this.listenToOutdoorTemperature().catch(this.error)
  }

  async refreshMelCloudDevicesAndGetExternalDevices (): Promise<any[]> {
    const driverId: string = 'melcloud'
    // @ts-expect-error bug
    const devices: any[] = Object.values(await this.api.devices.getDevices())
    this.melCloudDevices = devices.filter(
      (device: any): boolean => device.driverId === driverId
    )
    return devices.filter(
      (device: any): boolean => device.driverId !== driverId
    )
  }

  async listenToOutdoorTemperature (
    { capabilityPath, enabled }: OutdoorTemperatureListenerData = {
      capabilityPath: this.homey.settings.get('capabilityPath') ?? '',
      enabled: this.homey.settings.get('enabled') ?? false
    }
  ): Promise<void> {
    if (enabled && capabilityPath === '') {
      throw new Error('Outdoor temperature is missing.')
    }
    const capability: string = await this.handleExternalListenerData({
      capabilityPath,
      enabled
    })
    if (
      this.externalListener.device === undefined ||
      this.homey.settings.get('enabled') === false
    ) {
      return
    }
    await this.setTargetTemperatures(
      this.externalListener.device.capabilitiesObj[capability]?.value
    )
    this.externalListener.temperature = this.makeCapabilityInstance(
      this.externalListener.device,
      capability
    )
    this.listenToMelCloudDevices()
  }

  async handleExternalListenerData ({
    capabilityPath,
    enabled
  }: OutdoorTemperatureListenerData): Promise<string> {
    try {
      const splitCapabilityPath: string[] = capabilityPath.split(':')
      if (splitCapabilityPath.length !== 2) {
        throw new Error('The selected outdoor temperature is invalid.')
      }
      const [id, capability]: string[] = splitCapabilityPath
      // @ts-expect-error bug
      const device = await this.api.devices.getDevice({ id })
      if (device.id !== this.externalListener?.device?.id) {
        this.externalListener.device = device
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
      await this.cleanListeners()
    }
  }

  setSettings (settings: Settings): void {
    for (const [setting, value] of Object.entries(settings)) {
      if (value !== this.homey.settings.get(setting)) {
        this.homey.settings.set(setting, value)
      }
    }
  }

  async cleanListeners (): Promise<void> {
    const listeners: Array<Partial<Listener> | MelCloudListener> = [
      this.externalListener,
      ...this.melCloudListeners
    ]
    for (const listener of listeners) {
      if (listener.temperature !== undefined) {
        listener.temperature.destroy()
      }
      if (
        'thermostatMode' in listener &&
        listener.thermostatMode !== undefined
      ) {
        listener.thermostatMode.destroy()
      }
      if (listener.device !== undefined) {
        listener.device.io = null
        const threshold: number =
          this.homey.settings.get('thresholds')[listener.device.id]
        await listener.device.setCapabilityValue(
          'target_temperature',
          threshold
        )
      }
    }
    this.log('Listening to outdoor temperature: listener has been cleaned')
  }

  async setTargetTemperatures (
    value: number | undefined,
    save: boolean = false,
    revert: boolean = false
  ): Promise<void> {
    if (value === undefined) {
      return
    }
    for (const melCloudDevice of this.melCloudDevices) {
      const thresholds: any = this.homey.settings.get('thresholds')
      let threshold: number | undefined = thresholds?.[melCloudDevice.id]
      if (threshold === undefined || save) {
        threshold = melCloudDevice.capabilitiesObj.target_temperature
          .value as number
        thresholds[melCloudDevice.id] = threshold
        this.setSettings({ thresholds })
      }
      await melCloudDevice.setCapabilityValue(
        'target_temperature',
        revert ? threshold : getTargetTemperature(threshold, value)
      )
    }
  }

  makeCapabilityInstance (
    device: Listener['device'],
    capability: string
  ): ReturnType<Listener['device']['makeCapabilityInstance']> {
    this.log(
      'Listening to outdoor temperature: listener has been created for',
      device.name,
      '-',
      capability,
      '...'
    )
    return device.makeCapabilityInstance(
      capability,
      async (value: number | string): Promise<void> => {
        this.log(
          'Listening to outdoor temperature:',
          value,
          'listened from',
          device.name,
          '-',
          capability
        )
        await this.setTargetTemperatures(
          device.id === this.externalListener.device?.id
            ? (value as number)
            : this.externalListener.temperature?.value,
          capability === 'target_temperature',
          capability === 'thermostat_mode' && value !== 'cooling'
        )
      }
    )
  }

  listenToMelCloudDevices (): void {
    this.melCloudListeners = []
    for (const melCloudDevice of this.melCloudDevices) {
      this.melCloudListeners.push({
        device: melCloudDevice,
        temperature: this.makeCapabilityInstance(
          melCloudDevice,
          'target_temperature'
        ),
        thermostatMode: this.makeCapabilityInstance(
          melCloudDevice,
          'thermostat_mode'
        )
      })
    }
  }

  async onUninit (): Promise<void> {
    await this.cleanListeners()
  }
}

module.exports = MELCloudExtensionApp
