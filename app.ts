// eslint-disable-next-line import/no-extraneous-dependencies
import { App } from 'homey'
import { HomeyAPIV3Local } from 'homey-api'
import type {
  CapabilityValue,
  Log,
  MELCloudListener,
  TemperatureListener,
  TemperatureListenerData,
  Settings,
  SettingValue,
  Thresholds,
} from './types'

const maxLogs: number = 100
const melcloudAtaDriverId: string = 'homey:app:com.mecloud:melcloud'

export default class MELCloudExtensionApp extends App {
  names!: Record<string, string>

  timeZone!: string

  api!: HomeyAPIV3Local

  melCloudDevices!: HomeyAPIV3Local.ManagerDevices.Device[]

  melCloudListeners!: Record<string, MELCloudListener>

  outdoorTemperatureListener!: TemperatureListener | null

  outdoorTemperatureCapability!: string

  outdoorTemperatureValue!: number

  async onInit(): Promise<void> {
    this.names = [
      'device',
      'outdoor_temperature',
      'temperature',
      'thermostat_mode',
    ].reduce<Record<string, string>>(
      (names, name: string) => ({
        ...names,
        [name]: this.homey.__(`names.${name}`),
      }),
      {}
    )

    this.timeZone = this.homey.clock.getTimezone()

    this.api = await HomeyAPIV3Local.createAppAPI({ homey: this.homey })
    // @ts-expect-error bug
    await this.api.devices.connect()

    this.melCloudDevices = []
    this.melCloudListeners = {}
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
    try {
      await this.autoAdjustCoolingAta()
    } catch (error: unknown) {
      this.error(error instanceof Error ? error.message : String(error))
      this.log('retry')
      this.homey.setTimeout(async (): Promise<void> => {
        await this.autoAdjustCoolingAta().catch(this.error)
      }, 60000)
    }
  }

  async cleanListeners(): Promise<void> {
    await Promise.all(
      Object.values(this.melCloudListeners).map(
        async (listener: MELCloudListener): Promise<void> => {
          await this.cleanListener(listener, 'thermostat_mode')
          await this.cleanListener(listener, 'temperature')
          delete this.melCloudListeners[listener.device.id]
        }
      )
    )
    if (this.outdoorTemperatureListener !== null) {
      await this.cleanListener(this.outdoorTemperatureListener, 'temperature')
    }
    this.log('listener.cleaned_all')
  }

  async cleanListener<T extends TemperatureListener>(
    listener: T extends MELCloudListener
      ? MELCloudListener
      : TemperatureListener,
    capability: T extends MELCloudListener
      ? keyof MELCloudListener
      : keyof TemperatureListener
  ): Promise<void> {
    if (!(capability in listener)) {
      return
    }
    const { device } = listener
    const { name } = device
    const deviceId: string = device.id
    listener[capability].destroy()
    this.log('listener.cleaned', {
      name,
      capability: this.names[capability],
    })
    if (deviceId === this.outdoorTemperatureListener?.device.id) {
      delete this.outdoorTemperatureListener.temperature
      return
    }
    delete this.melCloudListeners[deviceId][capability]
    if (capability === 'temperature') {
      await this.revertTemperature(device, this.getThreshold(deviceId))
    }
  }

  async revertTemperature(
    device: HomeyAPIV3Local.ManagerDevices.Device,
    value: number
  ): Promise<void> {
    await device
      .setCapabilityValue({
        capabilityId: 'target_temperature',
        value,
      })
      .then((): void => {
        this.log('target_temperature.reverted', {
          name: device.name,
          value: `${value} °C`,
        })
      })
      .catch(this.error)
  }

  getThreshold(deviceId: string): number {
    return this.homey.settings.get('thresholds')?.[deviceId]
  }

  updateThreshold(
    device: HomeyAPIV3Local.ManagerDevices.Device,
    value: number
  ): number {
    const thresholds: Thresholds = this.homey.settings.get('thresholds') ?? {}
    thresholds[device.id] = value
    this.setSettings({ thresholds })
    this.log('target_temperature.saved', {
      name: device.name,
      value: `${value} °C`,
    })
    return value
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
    { capabilityPath, enabled }: TemperatureListenerData = {
      capabilityPath: this.homey.settings.get('capabilityPath') ?? '',
      enabled: this.homey.settings.get('enabled') ?? false,
    }
  ): Promise<void> {
    if (enabled && capabilityPath === '') {
      throw new Error(this.homey.__('error.missing'))
    }
    await this.handleTemperatureListenerData({
      capabilityPath,
      enabled,
    })
    if (
      this.outdoorTemperatureListener !== null &&
      this.homey.settings.get('enabled') === true
    ) {
      await this.listenToThermostatModes()
    }
  }

  async handleTemperatureListenerData({
    capabilityPath,
    enabled,
  }: TemperatureListenerData): Promise<void> {
    try {
      const [device, capability]: [
        HomeyAPIV3Local.ManagerDevices.Device,
        string
      ] = await this.validateCapabilityPath(capabilityPath)
      this.setSettings({
        capabilityPath,
        enabled,
      })
      if (this.outdoorTemperatureListener === null) {
        this.outdoorTemperatureListener = { device }
      } else if (device.id !== this.outdoorTemperatureListener.device.id) {
        this.outdoorTemperatureListener.device = device
      }
      this.outdoorTemperatureCapability = capability
      this.handleOutdoorTemperatureDeviceUpdate(capabilityPath)
    } catch (error: unknown) {
      if (capabilityPath !== '') {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    } finally {
      await this.cleanListeners()
    }
  }

  async validateCapabilityPath(
    capabilityPath: string
  ): Promise<[HomeyAPIV3Local.ManagerDevices.Device, string]> {
    const [deviceId, capability]: string[] = capabilityPath.split(':')
    if (capability === undefined || capability === '') {
      throw new Error(
        this.homey.__('error.not_found', {
          name: this.names.outdoor_temperature,
          id: capabilityPath,
        })
      )
    }
    let device: HomeyAPIV3Local.ManagerDevices.Device | null = null
    try {
      // @ts-expect-error bug
      device = await this.api.devices.getDevice({
        id: deviceId,
      })
    } catch (error: unknown) {
      throw new Error(
        this.homey.__('error.not_found', {
          name: this.names.device,
          id: deviceId,
        })
      )
    }
    // @ts-expect-error bug
    if (device === null || !(capability in (device.capabilitiesObj ?? {}))) {
      throw new Error(
        this.homey.__('error.not_found', {
          name: this.names.outdoor_temperature,
          id: capability,
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
              name: this.names.outdoor_temperature,
              id: capabilityPath,
            })
          )
          await this.cleanListeners()
        }
      }
    )
  }

  async listenToThermostatModes(): Promise<void> {
    this.melCloudListeners = this.melCloudDevices.reduce<
      Record<string, MELCloudListener>
    >(
      (devices, device: HomeyAPIV3Local.ManagerDevices.Device) => ({
        ...devices,
        [device.id]: { device },
      }),
      {}
    )
    const capabilityId: string = 'thermostat_mode'
    const capability: string = this.names.thermostat_mode
    await Promise.all(
      Object.values(this.melCloudListeners).map(
        async (listener: MELCloudListener) => {
          const { device } = listener
          const { name } = device
          const deviceId: string = device.id
          const currentThermostatMode: string =
            // @ts-expect-error bug
            await this.api.devices.getCapabilityValue({
              deviceId,
              capabilityId,
            })
          this.melCloudListeners[deviceId].thermostat_mode =
            device.makeCapabilityInstance(
              capabilityId,
              async (value: CapabilityValue): Promise<void> => {
                this.log('listener.listened', {
                  name,
                  capability,
                  value,
                })
                if (value === 'cool') {
                  await this.listenToTargetTemperature(listener)
                  return
                }
                await this.cleanListener(listener, 'temperature')
                const thermostatModes: string[] =
                  await this.getOtherThermostatModes(listener)
                if (
                  thermostatModes.every(
                    (mode: string): boolean => mode !== 'cool'
                  )
                ) {
                  if (this.outdoorTemperatureListener !== null) {
                    await this.cleanListener(
                      this.outdoorTemperatureListener,
                      'temperature'
                    )
                  }
                }
              }
            )
          this.log('listener.created', {
            name,
            capability,
          })
          if (currentThermostatMode === 'cool') {
            await this.listenToTargetTemperature(listener)
          }
        }
      )
    )
  }

  async getOtherThermostatModes(
    excludedListener: MELCloudListener
  ): Promise<string[]> {
    const capabilityId: string = 'thermostat_mode'
    return Promise.all(
      Object.values(this.melCloudListeners)
        .filter(
          ({ device }): boolean => device.id !== excludedListener.device.id
        )
        .map(async ({ device }): Promise<string> => {
          const thermostatMode: string =
            // @ts-expect-error bug
            await this.api.devices.getCapabilityValue({
              deviceId: device.id,
              capabilityId,
            })
          return thermostatMode
        })
    )
  }

  async listenToTargetTemperature(listener: MELCloudListener): Promise<void> {
    if ('temperature' in listener) {
      return
    }
    const { device } = listener
    const { name } = device
    const deviceId: string = device.id
    const capabilityId: string = 'target_temperature'
    const capability: string = this.names.temperature
    await this.listenToOutdoorTemperature()
    const currentTargetTemperature: number =
      // @ts-expect-error bug
      await this.api.devices.getCapabilityValue({
        deviceId,
        capabilityId,
      })
    this.melCloudListeners[deviceId].temperature =
      device.makeCapabilityInstance(
        capabilityId,
        async (value: CapabilityValue): Promise<void> => {
          if (
            value === this.getTargetTemperature(this.getThreshold(deviceId))
          ) {
            return
          }
          this.log('listener.listened', {
            name,
            capability,
            value: `${value as number} °C`,
          })
          await this.handleTargetTemperature(
            listener,
            this.updateThreshold(device, value as number)
          )
        }
      )
    this.log('listener.created', {
      name,
      capability,
    })
    await this.handleTargetTemperature(
      listener,
      this.updateThreshold(device, currentTargetTemperature)
    )
  }

  async listenToOutdoorTemperature(): Promise<void> {
    if (
      this.outdoorTemperatureListener === null ||
      'temperature' in this.outdoorTemperatureListener
    ) {
      return
    }
    const { device } = this.outdoorTemperatureListener
    const { name } = device
    const deviceId: string = device.id
    const capabilityId: string = this.outdoorTemperatureCapability
    const capability: string = this.names.temperature
    this.outdoorTemperatureValue =
      // @ts-expect-error bug
      await this.api.devices.getCapabilityValue({
        deviceId,
        capabilityId,
      })
    if ('temperature' in this.outdoorTemperatureListener) {
      return
    }
    this.outdoorTemperatureListener.temperature = device.makeCapabilityInstance(
      capabilityId,
      async (value: CapabilityValue): Promise<void> => {
        this.outdoorTemperatureValue = value as number
        this.log('listener.listened', {
          name,
          capability,
          value: `${value} °C`,
        })
        await Promise.all(
          Object.values(this.melCloudListeners).map(
            async (listener: MELCloudListener): Promise<void> => {
              const melCloudDeviceId: string = listener.device.id
              await this.handleTargetTemperature(
                listener,
                this.getThreshold(melCloudDeviceId)
              )
            }
          )
        )
      }
    )
    this.log('listener.created', {
      name,
      capability,
    })
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
    if (!('temperature' in listener)) {
      return
    }
    const value: number = this.getTargetTemperature(threshold)
    await listener.temperature
      .setValue(value)
      .then((): void => {
        this.log('target_temperature.calculated', {
          name: listener.device.name,
          value: `${value} °C`,
          threshold: `${threshold} °C`,
          outdoorTemperature: `${this.outdoorTemperatureValue} °C`,
        })
      })
      .catch(this.error)
  }

  setSettings(settings: Settings): void {
    Object.entries(settings).forEach(
      ([setting, value]: [string, SettingValue]): void => {
        if (value !== this.homey.settings.get(setting)) {
          this.homey.settings.set(setting, value)
        }
      }
    )
  }

  error(message: string): void {
    super.error(message)
    this.pushToLastLogs({
      time: this.getNow(),
      message,
      action: 'error',
    })
  }

  log(
    action: string,
    params: {
      capability?: string
      name?: string
      outdoorTemperature?: string
      threshold?: string
      value?: CapabilityValue
    } = {}
  ): void {
    const { name, capability, value, threshold, outdoorTemperature } = params
    const message: string = this.homey
      .__(`log.${action}`, {
        name,
        capability,
        value,
        threshold,
        outdoorTemperature,
      })
      .replace(/a el/gi, 'al')
      .replace(/de le/gi, 'du')
    super.log(message)
    this.pushToLastLogs({
      time: this.getNow(),
      message,
      action,
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

  getNow(): string {
    return new Date().toLocaleString(this.homey.i18n.getLanguage(), {
      timeZone: this.timeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
    })
  }

  async onUninit(): Promise<void> {
    await this.cleanListeners()
  }
}

module.exports = MELCloudExtensionApp
