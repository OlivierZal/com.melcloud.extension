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
    this.externalListener.temperature =
      this.externalListener.device.makeCapabilityInstance(
        capability,
        // @ts-expect-error bug
        async (value: number): Promise<void> => {
          this.log(
            'Listening to',
            this.externalListener.device?.name ?? 'Undefined',
            '-',
            capability,
            ': listened',
            value,
            '°C'
          )
          for (const melCloudListener of this.melCloudListeners) {
            await this.listenToMelCloudDevice(melCloudListener, value)
          }
        }
      )
    this.log(
      'Listener has been created for',
      this.externalListener.device.name,
      '-',
      capability
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
      this.error(error instanceof Error ? error.message : error)
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
    if (this.externalListener.temperature !== undefined) {
      this.externalListener.temperature.destroy()
      this.externalListener = {}
    }
    for (const listener of this.melCloudListeners) {
      if (listener.device === undefined) {
        continue
      }
      if (listener.thermostatMode !== undefined) {
        listener.thermostatMode.destroy()
      }
      await this.revertTargetTemperature(
        listener,
        this.homey.settings.get('thresholds')?.[listener.device.id]
      )
      this.melCloudListeners = []
    }
    this.log('All listeners have been cleaned')
  }

  listenToMelCloudDevices (capability: string): void {
    this.melCloudListeners = this.melCloudDevices.map(
      (device: HomeyAPIV2.ManagerDevices.Device): Listener => ({
        device
      })
    )
    for (const listener of this.melCloudListeners) {
      this.saveTargetTemperature(listener)
      listener.thermostatMode = listener.device.makeCapabilityInstance(
        'thermostat_mode',
        // @ts-expect-error bug
        async (thermostatMode: number): Promise<void> => {
          this.log(
            'Listening to',
            listener.device.name,
            '- thermostat_mode: listened',
            thermostatMode
          )
          await this.listenToMelCloudDevice(
            listener,
            this.externalListener.temperature?.value ?? // @ts-expect-error bug
              this.externalListener.device?.capabilitiesObj[capability]?.value
          )
        }
      )
      this.log(
        'Listener has been created for',
        listener.device.name,
        '- thermostat_mode'
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
      await this.revertTargetTemperature(listener, threshold)
    } else {
      if (listener.temperature === undefined) {
        listener.temperature = listener.device.makeCapabilityInstance(
          'target_temperature',
          // @ts-expect-error bug
          async (targetTemperature: number): Promise<void> => {
            this.log(
              'Listening to',
              listener.device.name,
              '- target_temperature: listened',
              targetTemperature,
              '°C'
            )
            this.saveTargetTemperature(listener, targetTemperature)
            const newTargetTemperature: number = this.getTargetTemperature(
              targetTemperature,
              this.externalListener.temperature?.value as number,
              listener
            )
            await listener.temperature
              ?.setValue(newTargetTemperature, {})
              .catch(this.error)
          }
        )
        this.log(
          'Listener has been created for',
          listener.device.name,
          '- target_temperature'
        )
      }
      const newTargetTemperature: number = this.getTargetTemperature(
        threshold,
        value,
        listener
      )
      await listener.temperature
        .setValue(newTargetTemperature, {})
        .catch(this.error)
    }
  }

  async revertTargetTemperature (
    listener: Listener,
    targetTemperature: number
  ): Promise<void> {
    if (listener.temperature === undefined) {
      return
    }
    await listener.temperature
      .setValue(targetTemperature, {})
      .catch(this.error)
    listener.temperature.destroy()
    delete listener.temperature
    this.log(
      'Listener for',
      listener.device.name,
      '- target_temperature has been cleaned and reverted to',
      targetTemperature,
      '°C'
    )
  }

  saveTargetTemperature (
    listener: Listener,
    // @ts-expect-error bug
    threshold: number = listener.device.capabilitiesObj.target_temperature.value
  ): void {
    const thresholds: any = this.homey.settings.get('thresholds') ?? {}
    thresholds[listener.device.id] = threshold
    this.setSettings({ thresholds })
    this.log(
      threshold,
      '°C saved for',
      listener.device.name,
      '- target_temperature'
    )
  }

  getTargetTemperature (
    threshold: number,
    value: number,
    listener: Listener
  ): number {
    const newTargetTemperature: number = Math.min(
      Math.max(threshold, Math.round(value - 8)),
      38
    )
    this.log(
      'Calculating',
      listener.device.name,
      '- target_temperature:',
      newTargetTemperature,
      '°C from threshold',
      threshold,
      'and',
      this.externalListener.device?.name ?? 'Undefined',
      value,
      '°C'
    )
    return newTargetTemperature
  }

  async onUninit (): Promise<void> {
    await this.cleanListeners()
  }
}

module.exports = MELCloudExtensionApp
