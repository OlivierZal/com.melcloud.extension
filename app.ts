import { HomeyAPIApp, type HomeyAPIV2 } from 'homey-api'
import { App } from 'homey'
import {
  type Listener,
  type OutdoorTemperatureListenerData,
  type Settings
} from './types'

export default class MELCloudExtensionApp extends App {
  api!: HomeyAPIApp
  melCloudDevices!: HomeyAPIV2.ManagerDevices.Device[]
  melCloudListeners!: Listener[]
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

  async refreshMelCloudDevicesAndGetExternalDevices (): Promise<
  HomeyAPIV2.ManagerDevices.Device[]
  > {
    const driverId: string = 'melcloud'
    // @ts-expect-error bug
    const devices: any[] = Object.values(await this.api.devices.getDevices())
    this.melCloudDevices = devices.filter(
      (device: HomeyAPIV2.ManagerDevices.Device): boolean =>
        device.driverId === driverId
    )
    return devices.filter(
      (device: HomeyAPIV2.ManagerDevices.Device): boolean =>
        device.driverId !== driverId
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
    this.listenToMelCloudDevices(capability)
    this.log(
      'Listening to outdoor temperature: listener has been created for',
      this.externalListener.device.name,
      '-',
      capability,
      '...'
    )
    this.externalListener.temperature =
      this.externalListener.device.makeCapabilityInstance(
        capability,
        // @ts-expect-error bug
        async (value: number): Promise<void> => {
          this.log(
            'Listening to outdoor temperature:',
            value,
            'listened from',
            this.externalListener.device?.name ?? 'Undefined',
            '-',
            capability
          )
          for (const melCloudListener of this.melCloudListeners) {
            await this.listenToMelCloudDevice(melCloudListener, value)
          }
        }
      )
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
      if (!(capability in device.capabilitiesObj)) {
        throw new Error(
          `${capability} cannot be found on ${device.name as string}.`
        )
      }
      this.setSettings({
        capabilityPath,
        enabled
      })
      this.externalListener.device = device
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
    if (this.externalListener?.temperature !== undefined) {
      this.externalListener.temperature.destroy()
    }
    for (const listener of this.melCloudListeners) {
      if (listener.device === undefined) {
        continue
      }
      if (listener.thermostatMode !== undefined) {
        listener.thermostatMode.destroy()
      }
      if (listener.temperature !== undefined) {
        await listener.temperature
          .setValue(
            this.homey.settings.get('thresholds')[listener.device.id],
            {}
          )
          .catch(this.error)
        listener.temperature.destroy()
      }
    }
    this.log('Listening to outdoor temperature: listeners have been cleaned')
  }

  listenToMelCloudDevices (capability: string): void {
    this.melCloudListeners = this.melCloudDevices.map(
      (device: HomeyAPIV2.ManagerDevices.Device): Listener => ({
        device
      })
    )
    for (const listener of this.melCloudListeners) {
      this.saveThreshold(
        listener.device.id,
        // @ts-expect-error bug
        listener.device.capabilitiesObj.target_temperature.value
      )
      this.log(
        'Listening to outdoor temperature: listener has been created for',
        listener.device.name,
        '- thermostat_mode...'
      )
      listener.thermostatMode = listener.device.makeCapabilityInstance(
        'thermostat_mode',
        // @ts-expect-error bug
        async (thermostatMode: number): Promise<void> => {
          this.log(
            'Listening to outdoor temperature:',
            thermostatMode,
            'listened from',
            listener.device.name,
            '- thermostat_mode'
          )
          await this.listenToMelCloudDevice(
            listener,
            this.externalListener.temperature?.value ?? // @ts-expect-error bug
              this.externalListener.device?.capabilitiesObj[capability]?.value
          )
        }
      )
    }
  }

  async listenToMelCloudDevice (
    listener: Listener,
    value: number
  ): Promise<void> {
    const threshold: number =
      this.homey.settings.get('thresholds')?.[listener.device.id]
    if (listener.thermostatMode?.value !== 'cool') {
      if (listener.temperature !== undefined) {
        await listener.temperature.setValue(threshold, {}).catch(this.error)
        this.log(
          'Listening to outdoor temperature: listener for',
          listener.device.name,
          '- target_temperature has been cleaned'
        )
        listener.temperature.destroy()
      }
    } else {
      if (listener.temperature === undefined) {
        this.log(
          'Listening to outdoor temperature: listener has been created for',
          listener.device.name,
          '- target_temperature...'
        )
        listener.temperature = listener.device.makeCapabilityInstance(
          'target_temperature',
          // @ts-expect-error bug
          async (targetTemperature: number): Promise<void> => {
            this.log(
              'Listening to outdoor temperature:',
              targetTemperature,
              'listened from',
              listener.device.name,
              '- target_temperature'
            )
            this.saveThreshold(listener.device.id, targetTemperature)
            await listener.temperature
              ?.setValue(this.getTargetTemperature(targetTemperature), {})
              .catch(this.error)
          }
        )
      }
      await listener.temperature
        ?.setValue(this.getTargetTemperature(threshold, value), {})
        .catch(this.error)
    }
  }

  saveThreshold (deviceId: string, threshold: number): void {
    const thresholds: any = this.homey.settings.get('thresholds') ?? {}
    thresholds[deviceId] = threshold
    this.setSettings({ thresholds })
  }

  getTargetTemperature (
    threshold: number,
    value: number = this.externalListener.temperature?.value as number
  ): number {
    return Math.min(Math.max(threshold, Math.round(value - 8)), 38)
  }

  async onUninit (): Promise<void> {
    await this.cleanListeners()
  }
}

module.exports = MELCloudExtensionApp
