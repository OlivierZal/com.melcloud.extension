import { HomeyAPIV3Local } from 'homey-api'
import { App } from 'homey'
import {
  type CapabilityValue,
  type Listener,
  type Log,
  type MELCloudListener,
  type TemperatureListener,
  type TemperatureListenerData,
  type Settings,
} from './types'

const icons: Record<string, string> = {
  'listener.cleaned': '🧽',
  'listener.cleaned_all': '💥',
  'listener.created': '🛠️',
  'listener.listened': '👂',
  'target_temperature.calculated': '🧮',
  'target_temperature.reverted': '🔙',
  'target_temperature.saved': '💾',
}
const maxLogs: number = 100
const melcloudAtaDriverId: string = 'homey:app:com.mecloud:melcloud'

export default class MELCloudExtensionApp extends App {
  capabilities!: Record<string, string>
  timeZone!: string
  api!: HomeyAPIV3Local
  melCloudDevices!: HomeyAPIV3Local.ManagerDevices.Device[]
  melCloudListeners!: MELCloudListener[]
  outdoorTemperatureListener!: TemperatureListener | null
  outdoorTemperatureCapability!: string
  outdoorTemperatureValue!: number

  async onInit(): Promise<void> {
    this.capabilities = ['temperature', 'thermostat_mode'].reduce<
      Record<string, string>
    >((capabilities, capabilityId: string) => {
      capabilities[capabilityId] = this.homey.__(
        `log.listener.capabilities.${capabilityId}`
      )
      return capabilities
    }, {})

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
          await this.cleanListener(listener, 'thermostat_mode')
          await this.cleanListener(listener, 'temperature')
        }
      )
    )
    this.melCloudListeners = []
    await this.cleanListener(this.outdoorTemperatureListener, 'temperature')
    this.log('listener.cleaned_all')
  }

  async cleanListener<T extends Listener>(
    listener: T | null,
    key: string
  ): Promise<void> {
    if (listener !== null && key in listener) {
      listener[key].destroy()
      if (key === 'thermostat_mode') {
        delete listener.thermostat_mode
      } else if (key === 'temperature') {
        delete listener.temperature
        if (listener !== this.outdoorTemperatureListener) {
          await this.revertTemperature(listener, this.getThreshold(listener))
        }
      }
      this.log('listener.cleaned', {
        device: listener.device.name,
        capability: this.capabilities[key],
      })
    }
  }

  async revertTemperature(
    listener: MELCloudListener,
    value: number
  ): Promise<void> {
    await listener.device
      // @ts-expect-error bug
      .setCapabilityValue({ capabilityId: 'target_temperature', value })
      .then((): void => {
        this.log('target_temperature.reverted', {
          device: listener.device.name,
          value: `${value} °C`,
        })
      })
      .catch(this.error)
  }

  cleanOutdoorTemperatureListener(): void {
    if (this.outdoorTemperatureListener?.temperature !== undefined) {
      this.outdoorTemperatureListener.temperature.destroy()
      this.log('listener.cleaned', {
        device: this.getOutdoorTemperatureDeviceName(
          this.outdoorTemperatureListener.device
        ),
        capability: this.capabilities.temperature,
      })
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
    this.log('target_temperature.saved', {
      device: listener.device.name,
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
      this.outdoorTemperatureListener?.device !== undefined &&
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
        string,
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
    const capability: string = this.capabilities.thermostat_mode
    for (const listener of this.melCloudListeners) {
      const currentThermostatMode: string =
        // @ts-expect-error bug
        await this.api.devices.getCapabilityValue({
          deviceId: listener.device.id,
          capabilityId,
        })
      listener.thermostat_mode = listener.device.makeCapabilityInstance(
        capabilityId,
        // @ts-expect-error bug
        async (value: CapabilityValue): Promise<void> => {
          this.log('listener.listened', {
            device: listener.device.name,
            capability,
            value,
          })
          if (value === 'cool') {
            await this.listenToTargetTemperature(listener)
            return
          }
          await this.cleanListener(listener, 'temperature')
          const thermostatModes: string[] = await this.getThermostatModes(
            listener
          )
          if (
            thermostatModes.every((mode: string): boolean => mode !== 'cool')
          ) {
            await this.cleanListener(
              this.outdoorTemperatureListener,
              'temperature'
            )
          }
        }
      )
      this.log('listener.created', {
        device: listener.device.name,
        capability,
      })
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
    const capability: string = this.capabilities.temperature
    await this.listenToOutdoorTemperature()
    const currentTargetTemperature: number =
      // @ts-expect-error bug
      await this.api.devices.getCapabilityValue({
        deviceId: listener.device.id,
        capabilityId,
      })
    listener.temperature = listener.device.makeCapabilityInstance(
      capabilityId,
      // @ts-expect-error bug
      async (value: CapabilityValue): Promise<void> => {
        if (value === this.getTargetTemperature(this.getThreshold(listener))) {
          return
        }
        this.log('listener.listened', {
          device: listener.device.name,
          capability,
          value: `${value as number} °C`,
        })
        await this.handleTargetTemperature(
          listener,
          this.updateThreshold(listener, value as number)
        )
      }
    )
    this.log('listener.created', {
      device: listener.device.name,
      capability,
    })
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
    const capability: string = this.capabilities.temperature
    this.outdoorTemperatureValue =
      // @ts-expect-error bug
      await this.api.devices.getCapabilityValue({
        deviceId: this.outdoorTemperatureListener.device.id,
        capabilityId,
      })
    this.outdoorTemperatureListener.temperature =
      this.outdoorTemperatureListener.device.makeCapabilityInstance(
        capabilityId,
        // @ts-expect-error bug
        async (value: CapabilityValue): Promise<void> => {
          this.outdoorTemperatureValue = value as number
          this.log('listener.listened', {
            device: this.getOutdoorTemperatureDeviceName(
              this.outdoorTemperatureListener?.device
            ),
            capability,
            value: `${this.outdoorTemperatureValue} °C`,
          })
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
    this.log('listener.created', {
      device: this.outdoorTemperatureListener.device.name,
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
    if (
      !('temperature' in listener) ||
      this.outdoorTemperatureListener === null
    ) {
      return
    }
    const value: number = this.getTargetTemperature(threshold)
    await listener.temperature
      .setValue(value, {})
      .then((): void => {
        this.log('target_temperature.calculated', {
          device: listener.device.name,
          value: `${value} °C`,
          threshold: `${threshold} °C`,
          outdoorTemperature: `${this.outdoorTemperatureValue} °C`,
        })
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
    const message: string = `⚠️ ${args.join(' ')}`
    super.error(message)
    this.pushToLastLogs({
      time: this.getNow(),
      message,
      error: true,
    })
  }

  log(
    action: string,
    params: {
      device?: string
      capability?: string
      value?: CapabilityValue
      threshold?: string
      outdoorTemperature?: string
    } = {}
  ): void {
    const { device, capability, value, threshold, outdoorTemperature } = params
    const message: string = `${icons[action]} ${this.homey.__(`log.${action}`, {
      device,
      capability,
      value,
      threshold,
      outdoorTemperature,
    })}`
      .replace(/a el/g, 'al')
      .replace(/de le/g, 'du')
    super.log(message)
    this.pushToLastLogs({
      time: this.getNow(),
      message,
    })
  }

  getNow(): string {
    return new Date().toLocaleString(this.homey.i18n.getLanguage(), {
      timeZone: this.timeZone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
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
