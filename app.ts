import { HomeyAPIV3Local } from 'homey-api'
import { App } from 'homey'
import {
  type Log,
  type MELCloudListener,
  type OutdoorTemperatureListener,
  type OutdoorTemperatureListenerData,
  type Settings,
} from './types'

const maxLogs: number = 100
const melcloudAtaDriverId: string = 'homey:app:com.mecloud:melcloud'

export default class MELCloudExtensionApp extends App {
  timeZone!: string
  api!: HomeyAPIV3Local
  melCloudDevices!: HomeyAPIV3Local.ManagerDevices.Device[]
  melCloudListeners!: MELCloudListener[]
  outdoorTemperatureListener!: OutdoorTemperatureListener | null
  outdoorTemperatureCapability!: string
  outdoorTemperatureValue!: number

  async onInit(): Promise<void> {
    this.timeZone = this.homey.clock.getTimezone()

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
  }

  async initialize(): Promise<void> {
    await this.refreshDevices()
    await this.autoAdjustCoolingAta().catch(this.error)
  }

  async cleanListeners(): Promise<void> {
    await Promise.all(
      this.melCloudListeners.map(
        async (listener: MELCloudListener): Promise<void> => {
          this.cleanThermostatModeListener(listener)
          await this.cleanTargetTemperatureListener(listener)
        }
      )
    )
    this.melCloudListeners = []
    this.cleanOutdoorTemperatureListener()
    this.log('All listeners have been cleaned')
  }

  cleanThermostatModeListener(listener: MELCloudListener): void {
    if ('thermostatMode' in listener) {
      listener.thermostatMode.destroy()
      delete listener.thermostatMode
      this.log(
        'Listener for',
        listener.device.name,
        '- thermostat_mode has been cleaned'
      )
    }
  }

  async cleanTargetTemperatureListener(
    listener: MELCloudListener
  ): Promise<void> {
    if ('temperature' in listener) {
      listener.temperature.destroy()
      delete listener.temperature
      this.log(
        'Listener for',
        listener.device.name,
        '- target_temperature has been cleaned'
      )
      const value: number = this.getThreshold(listener)
      await listener.device
        // @ts-expect-error bug
        .setCapabilityValue({ capabilityId: 'target_temperature', value })
        .then((): void => {
          this.log(
            'Reverting',
            listener.device.name,
            '- target_temperature to',
            value,
            '°C'
          )
        })
        .catch(this.error)
    }
  }

  getThreshold(listener: MELCloudListener): number {
    return this.homey.settings.get('thresholds')?.[listener.device.id]
  }

  updateThreshold(listener: MELCloudListener, threshold: number): number {
    const thresholds: Partial<Record<string, number>> =
      this.homey.settings.get('thresholds') ?? {}
    thresholds[listener.device.id] = threshold
    this.setSettings({ thresholds })
    this.log(
      threshold,
      '°C saved for',
      listener.device.name,
      '- target_temperature'
    )
    return threshold
  }

  cleanOutdoorTemperatureListener(): void {
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
    try {
      const [device, capability]: [
        HomeyAPIV3Local.ManagerDevices.Device,
        string
      ] = await this.validateCapabilityPath(capabilityPath)
      this.setSettings({
        capabilityPath,
        enabled,
      })
      this.outdoorTemperatureCapability = capability
      this.outdoorTemperatureListener = { device }
      this.handleOutdoorTemperatureDeviceUpdate(capabilityPath)
    } catch (error: unknown) {
      if (capabilityPath !== '') {
        this.error(error instanceof Error ? error.message : error)
      }
    } finally {
      await this.cleanListeners()
    }
  }

  async validateCapabilityPath(
    capabilityPath: string
  ): Promise<[HomeyAPIV3Local.ManagerDevices.Device, string]> {
    const [id, capability]: string[] = capabilityPath.split(':')
    if (capability === undefined || capability === '') {
      throw new Error(
        this.homey.__('app.outdoor_temperature.invalid', { capabilityPath })
      )
    }
    let device: HomeyAPIV3Local.ManagerDevices.Device | null = null
    try {
      // @ts-expect-error bug
      device = await this.api.devices.getDevice({
        id,
      })
    } catch (error: unknown) {
      throw new Error(this.homey.__('app.device.not_found', { id }))
    }
    // @ts-expect-error bug
    if (device === null || !(capability in (device.capabilitiesObj ?? {}))) {
      throw new Error(
        this.homey.__('app.outdoor_temperature.not_found', { capabilityPath })
      )
    }
    return [device, capability]
  }

  handleOutdoorTemperatureDeviceUpdate(capabilityPath: string): void {
    // @ts-expect-error bug
    this.outdoorTemperatureListener.device.on(
      'update',
      async (): Promise<void> => {
        if (
          !(
            this.outdoorTemperatureCapability in
            // @ts-expect-error bug
            (this.outdoorTemperatureListener.device.capabilitiesObj ?? {})
          )
        ) {
          this.error(
            this.homey.__('app.outdoor_temperature.not_found', {
              capabilityPath,
            })
          )
          await this.cleanListeners()
        }
      }
    )
  }

  async listenToThermostatModes(): Promise<void> {
    this.melCloudListeners = this.melCloudDevices.map(
      (device: HomeyAPIV3Local.ManagerDevices.Device): MELCloudListener => ({
        device,
      })
    )
    for (const listener of this.melCloudListeners) {
      const currentThermostatMode: string =
        // @ts-expect-error bug
        await this.api.devices.getCapabilityValue({
          deviceId: listener.device.id,
          capabilityId: 'thermostat_mode',
        })
      // @ts-expect-error bug
      listener.thermostatMode = listener.device.makeCapabilityInstance(
        'thermostat_mode',
        async (thermostatMode: string): Promise<void> => {
          this.log(
            thermostatMode,
            'listened from',
            listener.device.name,
            '- thermostat_mode'
          )
          if (thermostatMode === 'cool') {
            await this.listenToTargetTemperature(listener)
            return
          }
          await this.cleanTargetTemperatureListener(listener)
          const thermostatModes: string[] = await this.getThermostatModes(
            listener
          )
          if (
            thermostatModes.every((mode: string): boolean => mode !== 'cool')
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
      if (currentThermostatMode === 'cool') {
        await this.listenToTargetTemperature(listener)
      }
    }
  }

  async getThermostatModes(
    excludedListener: MELCloudListener
  ): Promise<string[]> {
    return await Promise.all(
      this.melCloudListeners
        .filter(
          (listener: MELCloudListener): boolean =>
            listener.device.id !== excludedListener.device.id &&
            'thermostatMode' in listener
        )
        .map(async ({ device }): Promise<string> => {
          const thermostatMode: string =
            // @ts-expect-error bug
            await this.api.devices.getCapabilityValue({
              deviceId: device.id,
              capabilityId: 'thermostat_mode',
            })
          return thermostatMode
        })
    )
  }

  async listenToTargetTemperature(listener: MELCloudListener): Promise<void> {
    if ('temperature' in listener) {
      return
    }
    await this.listenToOutdoorTemperature()
    const currentTargetTemperature: number =
      // @ts-expect-error bug
      await this.api.devices.getCapabilityValue({
        deviceId: listener.device.id,
        capabilityId: 'target_temperature',
      })
    // @ts-expect-error bug
    listener.temperature = listener.device.makeCapabilityInstance(
      'target_temperature',
      async (targetTemperature: number): Promise<void> => {
        if (
          targetTemperature ===
          this.getTargetTemperature(this.getThreshold(listener))
        ) {
          return
        }
        this.log(
          targetTemperature,
          '°C listened from',
          listener.device.name,
          '- target_temperature'
        )
        await this.handleTargetTemperature(
          listener,
          this.updateThreshold(listener, targetTemperature)
        )
      }
    )
    this.log(
      'Listener has been created for',
      listener.device.name,
      '- target_temperature'
    )
    await this.handleTargetTemperature(
      listener,
      this.updateThreshold(listener, currentTargetTemperature)
    )
  }

  async listenToOutdoorTemperature(): Promise<void> {
    if (
      this.outdoorTemperatureListener === null ||
      'temperature' in this.outdoorTemperatureListener
    ) {
      return
    }
    this.outdoorTemperatureValue =
      // @ts-expect-error bug
      await this.api.devices.getCapabilityValue({
        deviceId: this.outdoorTemperatureListener.device.id,
        capabilityId: this.outdoorTemperatureCapability,
      })
    this.outdoorTemperatureListener.temperature =
      // @ts-expect-error bug
      this.outdoorTemperatureListener.device.makeCapabilityInstance(
        this.outdoorTemperatureCapability,
        async (outdoorTemperature: number): Promise<void> => {
          this.outdoorTemperatureValue = outdoorTemperature
          this.log(
            this.outdoorTemperatureValue,
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
                await this.handleTargetTemperature(
                  listener,
                  this.getThreshold(listener)
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

  getTargetTemperature(threshold: number): number {
    return Math.min(
      Math.max(threshold, Math.ceil(this.outdoorTemperatureValue) - 8),
      38
    )
  }

  async handleTargetTemperature(
    listener: MELCloudListener,
    threshold: number
  ): Promise<void> {
    await this.listenToOutdoorTemperature()
    if (!('temperature' in listener)) {
      return
    }
    await this.updateTargetTemperature(listener, threshold)
  }

  async updateTargetTemperature(
    listener: MELCloudListener,
    threshold: number
  ): Promise<void> {
    if (
      !('temperature' in listener) ||
      this.outdoorTemperatureListener === null
    ) {
      return
    }
    const newTargetTemperature: number = this.getTargetTemperature(threshold)
    await listener.temperature
      .setValue(newTargetTemperature, {})
      .then((): void => {
        this.log(
          'Calculating',
          listener.device.name,
          '- target_temperature:',
          newTargetTemperature,
          '°C (from threshold',
          threshold,
          '°C and',
          this.getOutdoorTemperatureDeviceName(
            this.outdoorTemperatureListener?.device
          ),
          this.outdoorTemperatureValue,
          '°C)'
        )
      })
      .catch(this.error)
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

  error(...args: any[]): void {
    super.error(...args)
    this.pushToLastLogs({
      time: this.getNow(),
      message: args.join(' '),
      error: true,
    })
  }

  log(...args: any[]): void {
    super.log(...args)
    this.pushToLastLogs({
      time: this.getNow(),
      message: args.join(' '),
    })
  }

  getNow(): string {
    return new Date().toLocaleTimeString(this.homey.i18n.getLanguage(), {
      timeZone: this.timeZone,
    })
  }

  pushToLastLogs(newLog: Log): void {
    const lastLogs: Log[] = this.homey.settings.get('lastLogs') ?? []
    lastLogs.unshift(newLog)
    if (lastLogs.length > maxLogs) {
      lastLogs.length = maxLogs
    }
    this.homey.settings.set('lastLogs', lastLogs)
    this.homey.api.realtime('log', newLog)
  }

  async onUninit(): Promise<void> {
    await this.cleanListeners()
  }
}

module.exports = MELCloudExtensionApp
