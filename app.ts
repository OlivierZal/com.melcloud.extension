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
    this.log(this.homey.__('log.listener.cleaned_all'))
  }

  cleanThermostatModeListener(listener: MELCloudListener): void {
    const capabilityId: string = 'thermostat_mode'
    if (capabilityId in listener) {
      listener.thermostat_mode.destroy()
      delete listener.thermostat_mode
      this.log(
        this.homey.__('log.listener.cleaned', {
          device: listener.device.name,
          capabilityId,
        })
      )
    }
  }

  async cleanTargetTemperatureListener(
    listener: MELCloudListener
  ): Promise<void> {
    const capabilityId: string = 'target_temperature'
    if (capabilityId in listener) {
      listener.target_temperature.destroy()
      delete listener.target_temperature
      this.log(
        this.homey.__('log.listener.cleaned', {
          device: listener.device.name,
          capabilityId,
        })
      )
      const value: number = this.getThreshold(listener)
      await listener.device
        // @ts-expect-error bug
        .setCapabilityValue({ capabilityId, value })
        .then((): void => {
          this.log(
            this.homey.__('log.revert', {
              device: listener.device.name,
              value: `${value} °C`,
            })
          )
        })
        .catch(this.error)
    }
  }

  getThreshold(listener: MELCloudListener): number {
    return this.homey.settings.get('thresholds')?.[listener.device.id]
  }

  updateThreshold(listener: MELCloudListener, value: number): number {
    const thresholds: Partial<Record<string, number>> =
      this.homey.settings.get('thresholds') ?? {}
    thresholds[listener.device.id] = value
    this.setSettings({ thresholds })
    this.log(
      this.homey.__('log.save', {
        device: listener.device.name,
        value: `${value} °C`,
      })
    )
    return value
  }

  cleanOutdoorTemperatureListener(): void {
    if (this.outdoorTemperatureListener?.temperature !== undefined) {
      this.outdoorTemperatureListener.temperature.destroy()
      this.log(
        this.homey.__('log.listener.cleaned', {
          device: this.getOutdoorTemperatureDeviceName(
            this.outdoorTemperatureListener.device
          ),
          capabilityId: this.outdoorTemperatureCapability,
        })
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
      throw new Error(this.homey.__('error.missing'))
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
        this.homey.__('error.invalid', {
          name: 'Outdoor temperature',
          id: capabilityPath,
        })
      )
    }
    let device: HomeyAPIV3Local.ManagerDevices.Device | null = null
    try {
      // @ts-expect-error bug
      device = await this.api.devices.getDevice({
        id,
      })
    } catch (error: unknown) {
      throw new Error(this.homey.__('error.not_found', { name: 'Device', id }))
    }
    // @ts-expect-error bug
    if (device === null || !(capability in (device.capabilitiesObj ?? {}))) {
      throw new Error(
        this.homey.__('error.not_found', {
          name: 'Outdoor temperature',
          id: capabilityPath,
        })
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
            this.homey.__('error.not_found', {
              name: 'Outdoor temperature',
              id: capabilityPath,
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
    const capabilityId: string = 'thermostat_mode'
    for (const listener of this.melCloudListeners) {
      const currentThermostatMode: string =
        // @ts-expect-error bug
        await this.api.devices.getCapabilityValue({
          deviceId: listener.device.id,
          capabilityId,
        })
      // @ts-expect-error bug
      listener.thermostat_mode = listener.device.makeCapabilityInstance(
        capabilityId,
        async (value: string): Promise<void> => {
          this.log(
            this.homey.__('log.listener.listened', {
              device: listener.device.name,
              capabilityId,
              value,
            })
          )
          if (value === 'cool') {
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
        this.homey.__('log.listener.created', {
          device: listener.device.name,
          capabilityId,
        })
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
    const capabilityId: string = 'target_temperature'
    await this.listenToOutdoorTemperature()
    const currentTargetTemperature: number =
      // @ts-expect-error bug
      await this.api.devices.getCapabilityValue({
        deviceId: listener.device.id,
        capabilityId,
      })
    // @ts-expect-error bug
    listener.target_temperature = listener.device.makeCapabilityInstance(
      capabilityId,
      async (value: number): Promise<void> => {
        if (value === this.getTargetTemperature(this.getThreshold(listener))) {
          return
        }
        this.log(
          this.homey.__('log.listener.listened', {
            device: listener.device.name,
            capabilityId,
            value: `${value} °C`,
          })
        )
        await this.handleTargetTemperature(
          listener,
          this.updateThreshold(listener, value)
        )
      }
    )
    this.log(
      this.homey.__('log.listener.created', {
        device: listener.device.name,
        capabilityId,
      })
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
    const capabilityId: string = this.outdoorTemperatureCapability
    this.outdoorTemperatureValue =
      // @ts-expect-error bug
      await this.api.devices.getCapabilityValue({
        deviceId: this.outdoorTemperatureListener.device.id,
        capabilityId,
      })
    this.outdoorTemperatureListener.temperature =
      // @ts-expect-error bug
      this.outdoorTemperatureListener.device.makeCapabilityInstance(
        capabilityId,
        async (value: number): Promise<void> => {
          this.outdoorTemperatureValue = value
          this.log(
            this.homey.__('log.listener.listened', {
              device: this.getOutdoorTemperatureDeviceName(
                this.outdoorTemperatureListener?.device
              ),
              capabilityId,
              value: `${value} °C`,
            })
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
      this.homey.__('log.listener.created', {
        device: this.outdoorTemperatureListener.device.name,
        capabilityId,
      })
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
    await listener.target_temperature
      .setValue(newTargetTemperature, {})
      .then((): void => {
        this.log(
          this.homey.__('log.calculate', {
            device: listener.device.name,
            value: `${newTargetTemperature} °C`,
            threshold,
            outdoorTemperature: this.outdoorTemperatureValue,
          })
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
