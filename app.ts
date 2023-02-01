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
  outdoorTemperatureListener!: Partial<Listener>
  outdoorTemperatureCapability!: string

  async onInit (): Promise<void> {
    // @ts-expect-error bug
    this.api = new HomeyAPIApp({ homey: this.homey })
    // @ts-expect-error bug
    await this.api.devices.connect()

    this.melCloudDevices = []
    this.melCloudListeners = []
    this.outdoorTemperatureListener = {}
    this.outdoorTemperatureCapability = ''
    await this.refreshMelCloudDevicesAndGetExternalDevices()
    await this.selfAdjustAtaCooling().catch(this.error)
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

  async selfAdjustAtaCooling (
    { capabilityPath, enabled }: OutdoorTemperatureListenerData = {
      capabilityPath: this.homey.settings.get('capabilityPath') ?? '',
      enabled: this.homey.settings.get('enabled') ?? false
    }
  ): Promise<void> {
    if (enabled && capabilityPath === '') {
      throw new Error('Outdoor temperature is missing.')
    }
    await this.handleoutdoorTemperatureListenerData({
      capabilityPath,
      enabled
    })
    if (
      this.outdoorTemperatureListener.device === undefined ||
      this.homey.settings.get('enabled') === false
    ) {
      return
    }
    this.listenToThermostatModes()
  }

  async handleoutdoorTemperatureListenerData ({
    capabilityPath,
    enabled
  }: OutdoorTemperatureListenerData): Promise<void> {
    try {
      const splitCapabilityPath: string[] = capabilityPath.split(':')
      if (splitCapabilityPath.length !== 2 || splitCapabilityPath[1] === '') {
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
      this.outdoorTemperatureListener.device = device
      this.outdoorTemperatureCapability = capability
    } catch (error: unknown) {
      this.error(error instanceof Error ? error.message : error)
      this.setSettings({
        capabilityPath: '',
        enabled: false
      })
      if (capabilityPath !== '') {
        throw error
      }
    } finally {
      await this.cleanListeners()
    }
  }

  listenToThermostatModes (): void {
    this.melCloudListeners = this.melCloudDevices.map(
      (device: HomeyAPIV2.ManagerDevices.Device): Listener => ({
        device
      })
    )
    for (const listener of this.melCloudListeners) {
      listener.thermostatMode = listener.device.makeCapabilityInstance(
        'thermostat_mode',
        // @ts-expect-error bug
        async (thermostatMode: number): Promise<void> => {
          this.log(
            thermostatMode,
            'listened from',
            listener.device.name,
            '- thermostat_mode'
          )
          await this.listenToTargetTemperature(
            listener,
            this.outdoorTemperatureListener.temperature?.value as number
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

  async listenToTargetTemperature (
    listener: Listener,
    // @ts-expect-error bug
    outdoorTemperature: number = this.outdoorTemperatureListener.device?.capabilitiesObj[
      this.outdoorTemperatureCapability
    ]?.value
  ): Promise<void> {
    const threshold: number =
      this.homey.settings.get('thresholds')?.[listener.device.id]
    if (listener.thermostatMode?.value !== 'cool') {
      if (
        this.melCloudListeners.every(
          (listener: Listener): boolean =>
            listener.thermostatMode?.value !== 'cool'
        )
      ) {
        this.cleanOutdoorTemperatureListener()
      }
      await this.cleanTargetTemperatureListener(listener, threshold)
      return
    }
    this.listenToOutdoorTemperature()
    if (listener.temperature === undefined) {
      listener.temperature = listener.device.makeCapabilityInstance(
        'target_temperature',
        // @ts-expect-error bug
        async (targetTemperature: number): Promise<void> => {
          await this.updateTargetTemperature(
            listener,
            targetTemperature,
            this.outdoorTemperatureListener.temperature?.value as number
          )
        }
      )
      this.log(
        'Listener has been created for',
        listener.device.name,
        '- target_temperature'
      )
      await this.updateTargetTemperature(listener, threshold, outdoorTemperature)
    }
  }

  async updateTargetTemperature (
    listener: Listener,
    targetTemperature: number,
    outdoorTemperature: number
  ): Promise<void> {
    this.log(
      targetTemperature,
      '°C listened from',
      listener.device.name,
      '- target_temperature'
    )
    this.saveTargetTemperature(listener, targetTemperature)
    const newTargetTemperature: number = this.getTargetTemperature(
      listener,
      targetTemperature,
      outdoorTemperature
    )
    await listener.temperature
      ?.setValue(newTargetTemperature, {})
      .catch(this.error)
  }

  listenToOutdoorTemperature (): void {
    if (
      this.outdoorTemperatureListener.device === undefined ||
      this.outdoorTemperatureListener.temperature !== undefined
    ) {
      return
    }
    this.outdoorTemperatureListener.temperature =
      this.outdoorTemperatureListener.device.makeCapabilityInstance(
        this.outdoorTemperatureCapability,
        // @ts-expect-error bug
        async (outdoorTemperature: number): Promise<void> => {
          this.log(
            outdoorTemperature,
            '°C listened from',
            this.outdoorTemperatureListener.device?.name ?? 'undefined',
            '-',
            this.outdoorTemperatureCapability
          )
          for (const melCloudListener of this.melCloudListeners) {
            await this.listenToTargetTemperature(melCloudListener, outdoorTemperature)
          }
        }
      )
    this.log(
      'Listener has been created for',
      this.outdoorTemperatureListener.device.name,
      '-',
      this.outdoorTemperatureCapability
    )
  }

  getTargetTemperature (
    listener: Listener,
    threshold: number,
    outdoorTemperature: number
  ): number {
    const newTargetTemperature: number = Math.min(
      Math.max(threshold, Math.round(outdoorTemperature - 8)),
      38
    )
    this.log(
      'Calculating',
      listener.device.name,
      '- target_temperature:',
      newTargetTemperature,
      '°C (from threshold',
      threshold,
      'and',
      this.outdoorTemperatureListener.device?.name ?? 'Undefined',
      outdoorTemperature,
      '°C)'
    )
    return newTargetTemperature
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

  setSettings (settings: Settings): void {
    for (const [setting, value] of Object.entries(settings)) {
      if (value !== this.homey.settings.get(setting)) {
        this.homey.settings.set(setting, value)
      }
    }
  }

  async onUninit (): Promise<void> {
    await this.cleanListeners()
  }

  async cleanListeners (): Promise<void> {
    this.cleanOutdoorTemperatureListener()
    for (const listener of this.melCloudListeners) {
      if (listener.device === undefined) {
        continue
      }
      this.cleanThermostatModeListener(listener)
      await this.cleanTargetTemperatureListener(
        listener,
        this.homey.settings.get('thresholds')?.[listener.device.id]
      )
    }
    this.melCloudListeners = []
    this.log('All listeners have been cleaned')
  }

  cleanOutdoorTemperatureListener (): void {
    if (this.outdoorTemperatureListener.temperature !== undefined) {
      this.outdoorTemperatureListener.temperature.destroy()
      delete this.outdoorTemperatureListener.temperature
      this.log(
        'Listener for',
        this.outdoorTemperatureListener.device?.name ?? 'undefined',
        '-',
        this.outdoorTemperatureCapability,
        'has been cleaned'
      )
    }
  }

  cleanThermostatModeListener (listener: Listener): void {
    if (listener.thermostatMode !== undefined) {
      listener.thermostatMode.destroy()
      delete listener.thermostatMode
      this.log(
        'Listener for',
        listener.device.name,
        '- thermostat_mode has been cleaned'
      )
    }
  }

  async cleanTargetTemperatureListener (
    listener: Listener,
    targetTemperature: number
  ): Promise<void> {
    if (listener.temperature !== undefined) {
      await listener.temperature
        .setValue(targetTemperature, {})
        .catch(this.error)
      this.log(
        listener.device.name,
        '- target_temperature reverted to',
        targetTemperature,
        '°C'
      )
      listener.temperature.destroy()
      delete listener.temperature
      this.log(
        'Listener for',
        listener.device.name,
        '- target_temperature has been cleaned'
      )
    }
  }
}

module.exports = MELCloudExtensionApp
