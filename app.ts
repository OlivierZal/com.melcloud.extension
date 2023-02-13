import { HomeyAPI, type HomeyAPIV2 } from 'homey-api'
import { App } from 'homey'
import {
  type MelCloudListener,
  type OutdoorTemperatureListener,
  type OutdoorTemperatureListenerData,
  type Settings
} from './types'

const melcloudAtaDriverId: string = 'homey:app:com.mecloud:melcloud'

export default class MELCloudExtensionApp extends App {
  api!: HomeyAPI
  melCloudDevices!: HomeyAPIV2.ManagerDevices.Device[]
  melCloudListeners!: MelCloudListener[]
  outdoorTemperatureListener!: Partial<OutdoorTemperatureListener>
  outdoorTemperatureCapability!: string

  async onInit(): Promise<void> {
    // @ts-expect-error bug
    this.api = await HomeyAPI.createAppAPI({ homey: this.homey })
    // @ts-expect-error bug
    await this.api.devices.connect()

    this.melCloudDevices = []
    this.melCloudListeners = []
    this.outdoorTemperatureListener = {}
    this.outdoorTemperatureCapability = ''
    await this.initialize()

    // @ts-expect-error bug
    this.api.devices.on('device.create', async (): Promise<void> => {
      await this.initialize()
    })
    // @ts-expect-error bug
    this.api.devices.on('device.delete', async (): Promise<void> => {
      await this.initialize()
    })
    this.homey.on('unload', (): void => {
      this.cleanListeners()
    })
  }

  async initialize(): Promise<void> {
    await this.refreshMelCloudDevices()
    await this.selfAdjustCoolingAta().catch(this.error)
  }

  cleanListeners(resetOutdoorTemperatureListener: boolean = false): void {
    for (const listener of this.melCloudListeners) {
      this.cleanThermostatModeListener(listener)
      this.cleanTargetTemperatureListener(listener)
    }
    this.melCloudListeners = []
    this.cleanOutdoorTemperatureListener(resetOutdoorTemperatureListener)
    this.log('All listeners have been cleaned')
  }

  cleanThermostatModeListener(listener: MelCloudListener): void {
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

  cleanTargetTemperatureListener(listener: MelCloudListener): void {
    if (listener.temperature !== undefined) {
      const targetTemperature: number =
        this.homey.settings.get('thresholds')?.[listener.device.id]
      listener.temperature
        .setValue(targetTemperature, {})
        .then((): void => {
          this.log(
            'Reverting',
            listener.device.name,
            '- target_temperature to',
            targetTemperature,
            '°C'
          )
        })
        .catch(this.error)
      listener.temperature.destroy()
      delete listener.temperature
      this.log(
        'Listener for',
        listener.device.name,
        '- target_temperature has been cleaned'
      )
    }
  }

  cleanOutdoorTemperatureListener(
    resetOutdoorTemperatureListener: boolean = false
  ): void {
    if (this.outdoorTemperatureListener.temperature !== undefined) {
      this.outdoorTemperatureListener.temperature.destroy()
      this.log(
        'Listener for',
        this.outdoorTemperatureListener.device?.name ?? 'Undefined',
        '-',
        this.outdoorTemperatureCapability,
        'has been cleaned'
      )
    }
    if (resetOutdoorTemperatureListener) {
      this.setSettings({
        capabilityPath: '',
        enabled: false
      })
      this.outdoorTemperatureCapability = ''
      this.outdoorTemperatureListener = {}
    }
  }

  async refreshMelCloudDevices(): Promise<void> {
    const devices: HomeyAPIV2.ManagerDevices.Device[] = await this.getDevices()
    this.melCloudDevices = devices.filter(
      (device: HomeyAPIV2.ManagerDevices.Device): boolean =>
        device.driverId === melcloudAtaDriverId
    )
  }

  async getDevices(): Promise<HomeyAPIV2.ManagerDevices.Device[]> {
    return Object.values(
      // @ts-expect-error bug
      await this.api.devices.getDevices()
    )
  }

  async selfAdjustCoolingAta(
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
      this.outdoorTemperatureListener.device !== undefined &&
      this.homey.settings.get('enabled') === true
    ) {
      await this.listenToThermostatModes()
    }
  }

  async handleoutdoorTemperatureListenerData({
    capabilityPath,
    enabled
  }: OutdoorTemperatureListenerData): Promise<void> {
    let resetOutdoorTemperatureListener: boolean = false
    try {
      const splitCapabilityPath: string[] = capabilityPath.split(':')
      if (splitCapabilityPath.length !== 2 || splitCapabilityPath[1] === '') {
        throw new Error(`Outdoor temperature is invalid (${capabilityPath}).`)
      }
      const [id, capability]: string[] = splitCapabilityPath
      const device: HomeyAPIV2.ManagerDevices.Device =
        // @ts-expect-error bug
        await this.api.devices.getDevice({ id })
      if (!(capability in device.capabilitiesObj)) {
        throw new Error(
          `Outdoor temperature ${capabilityPath} cannot be found.`
        )
      }
      this.setSettings({
        capabilityPath,
        enabled
      })
      this.outdoorTemperatureCapability = capability
      this.outdoorTemperatureListener.device = device
      // @ts-expect-error bug
      this.outdoorTemperatureListener.device.on(
        'update',
        async (): Promise<void> => {
          if (
            this.outdoorTemperatureListener.device !== undefined &&
            this.outdoorTemperatureListener.device.id === id &&
            !(
              this.outdoorTemperatureCapability in
              this.outdoorTemperatureListener.device.capabilitiesObj
            )
          ) {
            this.error('Outdoor temperature', capabilityPath, 'cannot be found')
            this.cleanListeners(true)
          }
        }
      )
    } catch (error: unknown) {
      resetOutdoorTemperatureListener = true
      this.error(error instanceof Error ? error.message : error)
      if (capabilityPath !== '') {
        throw error
      }
    } finally {
      this.cleanListeners(resetOutdoorTemperatureListener)
    }
  }

  async listenToThermostatModes(): Promise<void> {
    this.melCloudListeners = this.melCloudDevices.map(
      (device: HomeyAPIV2.ManagerDevices.Device): MelCloudListener => ({
        device
      })
    )
    for (const listener of this.melCloudListeners) {
      // @ts-expect-error bug
      listener.thermostatMode = listener.device.makeCapabilityInstance(
        'thermostat_mode',
        async (thermostatMode: number): Promise<void> => {
          this.log(
            thermostatMode,
            'listened from',
            listener.device.name,
            '- thermostat_mode'
          )
          if (listener.thermostatMode?.value === 'cool') {
            await this.listenToTargetTemperature(listener)
            return
          }
          this.cleanTargetTemperatureListener(listener)
          if (
            this.melCloudListeners.every(
              (listener: MelCloudListener): boolean =>
                listener.thermostatMode?.value !== 'cool'
            )
          ) {
            this.cleanOutdoorTemperatureListener()
          }
        }
      )
      this.log(
        'Listener has been created for',
        listener.device.name,
        '- thermostat_mode'
      )
      if (listener.thermostatMode?.value === 'cool') {
        await this.listenToTargetTemperature(listener)
      }
    }
  }

  async listenToTargetTemperature(listener: MelCloudListener): Promise<void> {
    if (listener.temperature !== undefined) {
      return
    }
    this.listenToOutdoorTemperature()
    // @ts-expect-error bug
    listener.temperature = listener.device.makeCapabilityInstance(
      'target_temperature',
      async (targetTemperature: number): Promise<void> => {
        this.log(
          targetTemperature,
          '°C listened from',
          listener.device.name,
          '- target_temperature'
        )
        await this.updateTargetTemperature(listener, targetTemperature)
      }
    )
    this.log(
      'Listener has been created for',
      listener.device.name,
      '- target_temperature'
    )
    await this.updateTargetTemperature(listener)
  }

  listenToOutdoorTemperature(): void {
    if (
      this.outdoorTemperatureListener.device === undefined ||
      this.outdoorTemperatureListener.temperature !== undefined
    ) {
      return
    }
    this.outdoorTemperatureListener.temperature =
      // @ts-expect-error bug
      this.outdoorTemperatureListener.device.makeCapabilityInstance(
        this.outdoorTemperatureCapability,
        async (outdoorTemperature: number): Promise<void> => {
          this.log(
            outdoorTemperature,
            '°C listened from',
            this.outdoorTemperatureListener.device?.name ?? 'Undefined',
            '-',
            this.outdoorTemperatureCapability
          )
          for (const melCloudListener of this.melCloudListeners) {
            await this.updateTargetTemperature(
              melCloudListener,
              undefined,
              outdoorTemperature
            )
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

  async updateTargetTemperature(
    listener: MelCloudListener,
    targetTemperature: number = listener.temperature?.value as number,
    outdoorTemperature?: number
  ): Promise<void> {
    this.listenToOutdoorTemperature()
    if (
      listener.temperature === undefined ||
      this.outdoorTemperatureListener.temperature === undefined
    ) {
      return
    }
    if (outdoorTemperature === undefined) {
      outdoorTemperature = this.outdoorTemperatureListener.temperature
        .value as number
      this.saveTargetTemperature(listener)
    }
    const newTargetTemperature: number = this.getTargetTemperature(
      listener,
      targetTemperature,
      outdoorTemperature
    )
    listener.temperature.setValue(newTargetTemperature, {}).catch(this.error)
  }

  saveTargetTemperature(listener: MelCloudListener): void {
    if (listener.temperature === undefined) {
      return
    }
    const threshold: number = listener.temperature.value as number
    const thresholds: any = this.homey.settings.get('thresholds') ?? {}
    thresholds[listener.device.id] = listener.temperature.value
    this.setSettings({ thresholds })
    this.log(
      threshold,
      '°C saved for',
      listener.device.name,
      '- target_temperature'
    )
  }

  getTargetTemperature(
    listener: MelCloudListener,
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

  async getMeasureTemperatureDevicesAta(): Promise<
    HomeyAPIV2.ManagerDevices.Device[]
  > {
    const devices: HomeyAPIV2.ManagerDevices.Device[] = await this.getDevices()
    return devices.filter(
      (device: HomeyAPIV2.ManagerDevices.Device): boolean =>
        device.driverId !== melcloudAtaDriverId &&
        device.capabilities.some((capability: string): boolean =>
          capability.startsWith('measure_temperature')
        )
    )
  }

  setSettings(settings: Settings): void {
    for (const [setting, value] of Object.entries(settings)) {
      if (value !== this.homey.settings.get(setting)) {
        this.homey.settings.set(setting, value)
      }
    }
  }

  async onUninit(): Promise<void> {
    this.cleanListeners()
  }
}

module.exports = MELCloudExtensionApp
