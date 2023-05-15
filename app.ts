import { HomeyAPIV3Local } from 'homey-api'
import { App } from 'homey'
import {
  type MELCloudListener,
  type OutdoorTemperatureListener,
  type OutdoorTemperatureListenerData,
  type Settings,
} from './types'

const melcloudAtaDriverId: string = 'homey:app:com.mecloud:melcloud'

export default class MELCloudExtensionApp extends App {
  api!: HomeyAPIV3Local
  melCloudDevices!: HomeyAPIV3Local.ManagerDevices.Device[]
  melCloudListeners!: MELCloudListener[]
  outdoorTemperatureListener!: OutdoorTemperatureListener | null
  outdoorTemperatureCapability!: string

  async onInit(): Promise<void> {
    // @ts-expect-error bug
    this.api = await HomeyAPIV3Local.createAppAPI({ homey: this.homey })
    // @ts-expect-error bug
    await this.api.devices.connect()

    this.melCloudDevices = []
    this.melCloudListeners = []
    this.outdoorTemperatureListener = null
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
    await this.refreshDevices()
    await this.autoAdjustCoolingAta().catch(this.error)
  }

  cleanListeners(resetOutdoorTemperatureListener: boolean = false): void {
    this.melCloudListeners.forEach((listener: MELCloudListener): void => {
      this.cleanThermostatModeListener(listener)
      this.cleanTargetTemperatureListener(listener)
    })
    this.melCloudListeners = []
    this.cleanOutdoorTemperatureListener(resetOutdoorTemperatureListener)
    this.log('All listeners have been cleaned')
  }

  cleanThermostatModeListener(listener: MELCloudListener): void {
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

  cleanTargetTemperatureListener(listener: MELCloudListener): void {
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
    if (this.outdoorTemperatureListener?.temperature !== undefined) {
      this.outdoorTemperatureListener.temperature.destroy()
      this.log(
        'Listener for',
        this.getOutdoorTemperatureDeviceName(
          this.outdoorTemperatureListener.device
        ),
        '-',
        this.outdoorTemperatureCapability,
        'has been cleaned'
      )
    }
    if (resetOutdoorTemperatureListener) {
      this.setSettings({
        capabilityPath: '',
        enabled: false,
      })
      this.outdoorTemperatureCapability = ''
      this.outdoorTemperatureListener = null
    }
  }

  async refreshDevices(): Promise<HomeyAPIV3Local.ManagerDevices.Device[]> {
    this.melCloudDevices = []
    const devices: HomeyAPIV3Local.ManagerDevices.Device[] =
      // @ts-expect-error bug
      await this.api.devices.getDevices()
    return Object.values(devices).reduce<
      HomeyAPIV3Local.ManagerDevices.Device[]
    >(
      (
        measureTemperatureDevices,
        device: HomeyAPIV3Local.ManagerDevices.Device
      ) => {
        // @ts-expect-error bug
        if (device.driverId === melcloudAtaDriverId) {
          this.melCloudDevices.push(device)
        } else if (
          // @ts-expect-error bug
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          device.capabilities.some((capability: string): boolean =>
            capability.startsWith('measure_temperature')
          )
        ) {
          measureTemperatureDevices.push(device)
        }
        return measureTemperatureDevices
      },
      []
    )
  }

  async autoAdjustCoolingAta(
    { capabilityPath, enabled }: OutdoorTemperatureListenerData = {
      capabilityPath: this.homey.settings.get('capabilityPath') ?? '',
      enabled: this.homey.settings.get('enabled') ?? false,
    }
  ): Promise<void> {
    if (enabled && capabilityPath === '') {
      throw new Error(this.homey.__('app.outdoor_temperature.missing'))
    }
    await this.handleOutdoorTemperatureListenerData({
      capabilityPath,
      enabled,
    })
    if (
      this.outdoorTemperatureListener?.device !== undefined &&
      this.homey.settings.get('enabled') === true
    ) {
      await this.listenToThermostatModes()
    }
  }

  async handleOutdoorTemperatureListenerData({
    capabilityPath,
    enabled,
  }: OutdoorTemperatureListenerData): Promise<void> {
    let resetOutdoorTemperatureListener: boolean = false
    try {
      const splitCapabilityPath: string[] = capabilityPath.split(':')
      if (splitCapabilityPath.length !== 2 || splitCapabilityPath[1] === '') {
        throw new Error(
          this.homey.__('app.outdoor_temperature.invalid', { capabilityPath })
        )
      }
      const [id, capability]: string[] = splitCapabilityPath
      const device: HomeyAPIV3Local.ManagerDevices.Device =
        // @ts-expect-error bug
        await this.api.devices.getDevice({ id })
      // @ts-expect-error bug
      if (!(capability in (device.capabilitiesObj ?? {}))) {
        throw new Error(
          this.homey.__('app.outdoor_temperature.not_found', { capabilityPath })
        )
      }
      this.setSettings({
        capabilityPath,
        enabled,
      })
      this.outdoorTemperatureCapability = capability
      this.outdoorTemperatureListener = { device }
      // @ts-expect-error bug
      this.outdoorTemperatureListener.device.on(
        'update',
        async (): Promise<void> => {
          if (
            this.outdoorTemperatureListener?.device.id === id &&
            !(
              this.outdoorTemperatureCapability in
              // @ts-expect-error bug
              (this.outdoorTemperatureListener.device.capabilitiesObj ?? {})
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
      (device: HomeyAPIV3Local.ManagerDevices.Device): MELCloudListener => ({
        device,
      })
    )
    await Promise.all(
      this.melCloudListeners.map(
        async (listener: MELCloudListener): Promise<void> => {
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
                  (listener: MELCloudListener): boolean =>
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
      )
    )
  }

  async listenToTargetTemperature(listener: MELCloudListener): Promise<void> {
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
      this.outdoorTemperatureListener?.device === undefined ||
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
            this.getOutdoorTemperatureDeviceName(
              this.outdoorTemperatureListener?.device
            ),
            '-',
            this.outdoorTemperatureCapability
          )
          await Promise.all(
            this.melCloudListeners.map(
              async (listener: MELCloudListener): Promise<void> => {
                await this.updateTargetTemperature(
                  listener,
                  undefined,
                  outdoorTemperature
                )
              }
            )
          )
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
    listener: MELCloudListener,
    targetTemperature: number = listener.temperature?.value as number,
    outdoorTemperature?: number
  ): Promise<void> {
    this.listenToOutdoorTemperature()
    if (
      listener.temperature === undefined ||
      this.outdoorTemperatureListener?.temperature === undefined
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

  saveTargetTemperature(listener: MELCloudListener): void {
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
    listener: MELCloudListener,
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
      this.getOutdoorTemperatureDeviceName(
        this.outdoorTemperatureListener?.device
      ),
      outdoorTemperature,
      '°C)'
    )
    return newTargetTemperature
  }

  getOutdoorTemperatureDeviceName(
    device?: HomeyAPIV3Local.ManagerDevices.Device
  ): string {
    return device?.name ?? 'Undefined'
  }

  setSettings(settings: Settings): void {
    Object.entries(settings).forEach(
      ([setting, value]: [string, any]): void => {
        if (value !== this.homey.settings.get(setting)) {
          this.homey.settings.set(setting, value)
        }
      }
    )
  }

  async onUninit(): Promise<void> {
    this.cleanListeners()
  }
}

module.exports = MELCloudExtensionApp
