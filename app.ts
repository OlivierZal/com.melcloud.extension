import axios from 'axios'
import { DateTime, Duration, Settings } from 'luxon'
import { App, type Driver } from 'homey'
import { HomeyAPIApp } from 'homey-api'
import {
  type Building,
  type Data,
  type ErrorLogData,
  type ErrorLogPostData,
  type FailureData,
  type FrostProtectionData,
  type FrostProtectionPostData,
  type FrostProtectionSettings,
  type HolidayModeData,
  type HolidayModePostData,
  type HolidayModeSettings,
  type ListDevice,
  type LoginCredentials,
  type LoginData,
  type LoginPostData,
  type MELCloudDevice,
  type OutdoorTemperatureListenerData,
  type PostData,
  type ReportData,
  type ReportPostData,
  type SuccessData,
  type UpdateData
} from './types'

export default class MELCloudApp extends App {
  api!: HomeyAPIApp | null
  buildings!: Record<
  Building<MELCloudDevice>['ID'],
  Building<MELCloudDevice>['Name']
  >

  outdoorTemperatureDevice!: any
  outdoorTemperatureListener!: any
  loginTimeout!: NodeJS.Timeout

  async onInit (): Promise<void> {
    Settings.defaultZone = this.homey.clock.getTimezone()
    axios.defaults.baseURL = 'https://app.melcloud.com/Mitsubishi.Wifi.Client'
    axios.defaults.headers.common['X-MitsContextKey'] =
      this.homey.settings.get('ContextKey')

    this.buildings = {}
    this.outdoorTemperatureDevice = null
    this.outdoorTemperatureListener = null
    await this.refreshLogin()
    if (this.manifest.permissions?.includes('homey:manager:api') === true) {
      // @ts-expect-error bug
      this.api = new HomeyAPIApp({ homey: this.homey })
      // @ts-expect-error bug
      await this.api.devices.connect()
      await this.listenToOutdoorTemperatureForAta().catch(this.error)
    } else {
      this.api = null
    }
  }

  async refreshLogin (): Promise<void> {
    this.clearLoginRefresh()
    const loginCredentials: LoginCredentials = {
      username: this.homey.settings.get('username') ?? '',
      password: this.homey.settings.get('password') ?? ''
    }
    const expiry: string | null = this.homey.settings.get('Expiry')
    const ms: number =
      expiry !== null
        ? Number(DateTime.fromISO(expiry).minus({ days: 1 }).diffNow())
        : 0
    if (ms > 0) {
      const maxTimeout: number = Math.pow(2, 31) - 1
      const interval: number = Math.min(ms, maxTimeout)
      this.loginTimeout = this.setTimeout(
        'login refresh',
        async (): Promise<boolean> => await this.login(loginCredentials),
        interval
      )
    } else {
      await this.login(loginCredentials)
    }
  }

  clearLoginRefresh (): void {
    this.homey.clearTimeout(this.loginTimeout)
    this.log('Login refresh has been stopped')
  }

  async login (loginCredentials: LoginCredentials): Promise<boolean> {
    try {
      const { username, password } = loginCredentials
      if (username === '' && password === '') {
        return false
      }
      const postData: LoginPostData = {
        AppVersion: '1.9.3.0',
        Email: username,
        Password: password,
        Persist: true
      }
      this.log('Login to MELCloud...\n', postData)
      const { data } = await axios.post<LoginData>(
        '/Login/ClientLogin',
        postData
      )
      this.log('Login to MELCloud:\n', data)
      if (data.LoginData?.ContextKey !== undefined) {
        axios.defaults.headers.common['X-MitsContextKey'] =
          data.LoginData.ContextKey
        this.setSettings({
          ContextKey: data.LoginData.ContextKey,
          Expiry: data.LoginData.Expiry,
          username,
          password
        })
        await this.refreshLogin()
        return true
      }
    } catch (error: unknown) {
      this.error(
        'Login to MELCloud:',
        error instanceof Error ? error.message : error
      )
    }
    return false
  }

  getDeviceIds (
    { buildingId, driverId }: { buildingId?: number, driverId?: string } = {},
    safe: boolean = true
  ): Array<MELCloudDevice['id']> {
    return this.getDevices({ buildingId, driverId }, safe).map(
      (device: MELCloudDevice): MELCloudDevice['id'] => device.id
    )
  }

  getDevices (
    { buildingId, driverId }: { buildingId?: number, driverId?: string } = {},
    safe: boolean = true
  ): MELCloudDevice[] {
    const drivers: Driver[] =
      driverId !== undefined
        ? [this.homey.drivers.getDriver(driverId)]
        : Object.values(this.homey.drivers.getDrivers())
    let devices: MELCloudDevice[] = []
    for (const driver of drivers) {
      for (const device of driver.getDevices()) {
        devices.push(device as MELCloudDevice)
      }
    }
    if (buildingId !== undefined) {
      devices = devices.filter(
        (device: MELCloudDevice): boolean => device.buildingid === buildingId
      )
      if (!safe && devices.length === 0) {
        throw new Error(`Building ${buildingId} has no device.`)
      }
    }
    return devices
  }

  async getBuildings (): Promise<Array<Building<MELCloudDevice>>> {
    try {
      this.log('Searching for buildings...')
      const { data } = await axios.get<Array<Building<MELCloudDevice>>>(
        '/User/ListDevices'
      )
      this.log('Searching for buildings:\n', data)
      return data
    } catch (error: unknown) {
      this.error(
        'Searching for buildings:',
        error instanceof Error ? error.message : error
      )
    }
    return []
  }

  async listDevices<T extends MELCloudDevice>(
    deviceType?: T['driver']['deviceType']
  ): Promise<Array<ListDevice<T>>> {
    const buildings: Array<Building<T>> = await this.getBuildings()
    let devices: Array<ListDevice<T>> = []
    for (const building of buildings) {
      if (
        !(building.ID in this.buildings) ||
        this.buildings[building.ID] !== building.Name
      ) {
        this.buildings[building.ID] = building.Name
      }
      devices.push(...building.Structure.Devices)
      for (const floor of building.Structure.Floors) {
        devices.push(...floor.Devices)
        for (const area of floor.Areas) {
          devices.push(...area.Devices)
        }
      }
      for (const area of building.Structure.Areas) {
        devices.push(...area.Devices)
      }
    }
    if (deviceType !== undefined) {
      devices = devices.filter(
        (device: ListDevice<T>): boolean =>
          deviceType === device.Device.DeviceType
      )
    }
    return devices
  }

  async getDevice<T extends MELCloudDevice>(
    device: T
  ): Promise<Data<T> | null> {
    try {
      device.log('Syncing from device...')
      const { data } = await axios.get<Data<T>>(
        `/Device/Get?id=${device.id}&buildingID=${device.buildingid}`
      )
      device.log('Syncing from device:\n', data)
      return data
    } catch (error: unknown) {
      device.error(
        'Syncing from device:',
        error instanceof Error ? error.message : error
      )
    }
    return null
  }

  async setDevice<T extends MELCloudDevice>(
    device: T,
    updateData: UpdateData<T>
  ): Promise<Data<T> | null> {
    try {
      const postData: PostData<T> = {
        DeviceID: device.id,
        HasPendingCommand: true,
        ...updateData
      }
      device.log('Syncing with device...\n', postData)
      const { data } = await axios.post<Data<T>>(
        `/Device/Set${device.driver.heatPumpType}`,
        postData
      )
      device.log('Syncing with device:\n', data)
      return data
    } catch (error: unknown) {
      device.error(
        'Syncing with device:',
        error instanceof Error ? error.message : error
      )
    }
    return null
  }

  async reportEnergyCost<T extends MELCloudDevice>(
    device: T,
    fromDate: DateTime,
    toDate: DateTime
  ): Promise<ReportData<T> | null> {
    try {
      const postData: ReportPostData<T> = {
        DeviceID: device.id,
        FromDate: fromDate.toISODate(),
        ToDate: toDate.toISODate(),
        UseCurrency: false
      }
      device.log('Reporting energy cost...\n', postData)
      const { data } = await axios.post<ReportData<T>>(
        '/EnergyCost/Report',
        postData
      )
      device.log('Reporting energy cost:\n', data)
      return data
    } catch (error: unknown) {
      device.error(
        'Reporting energy cost:',
        error instanceof Error ? error.message : error
      )
    }
    return null
  }

  async setDeviceSettings (settings: Settings): Promise<boolean> {
    const changedKeys: string[] = Object.keys(settings)
    if (changedKeys.length === 0) {
      return false
    }
    for (const device of this.getDevices()) {
      await device.setSettings(settings)
      await device.onSettings({
        newSettings: device.getSettings(),
        changedKeys
      })
    }
    return true
  }

  async getUnitErrorLog (
    fromDate: DateTime,
    toDate: DateTime
  ): Promise<ErrorLogData[] | boolean> {
    const postData: ErrorLogPostData = {
      DeviceIDs: this.getDeviceIds(),
      FromDate: fromDate.toISODate(),
      ToDate: toDate.toISODate()
    }
    this.log('Reporting error log...\n', postData)
    const { data } = await axios.post<ErrorLogData[] | FailureData>(
      '/Report/GetUnitErrorLog2',
      postData
    )
    this.log('Reporting error log:\n', data)
    if ('Success' in data) {
      return this.handleFailure(data)
    }
    return data
  }

  async getFrostProtectionSettings (
    buildingId: number
  ): Promise<FrostProtectionData> {
    if (!(buildingId in this.buildings)) {
      throw new Error(`Building ${buildingId} does not exist.`)
    }
    const buildingName: Building<MELCloudDevice>['Name'] =
      this.buildings[buildingId]
    this.log(
      'Getting frost protection settings for building',
      buildingName,
      '...'
    )
    const buildingDeviceIds: Array<MELCloudDevice['id']> = this.getDeviceIds(
      { buildingId },
      false
    )
    const { data } = await axios.get<FrostProtectionData>(
      `/FrostProtection/GetSettings?tableName=DeviceLocation&id=${buildingDeviceIds[0]}`
    )
    this.log(
      'Getting frost protection settings for building',
      buildingName,
      ':\n',
      data
    )
    return data
  }

  async updateFrostProtectionSettings (
    buildingId: number,
    settings: FrostProtectionSettings
  ): Promise<boolean> {
    if (!(buildingId in this.buildings)) {
      throw new Error(`Building ${buildingId} does not exist.`)
    }
    const buildingName: Building<MELCloudDevice>['Name'] =
      this.buildings[buildingId]
    const postData: FrostProtectionPostData = {
      ...settings,
      BuildingIds: [buildingId]
    }
    this.log(
      'Updating frost protection settings for building',
      buildingName,
      '...\n',
      postData
    )
    const { data } = await axios.post<SuccessData>(
      '/FrostProtection/Update',
      postData
    )
    this.log(
      'Updating frost protection settings for building',
      buildingName,
      ':\n',
      data
    )
    return this.handleFailure(data)
  }

  async getHolidayModeSettings (buildingId: number): Promise<HolidayModeData> {
    if (!(buildingId in this.buildings)) {
      throw new Error(`Building ${buildingId} does not exist.`)
    }
    const buildingName: Building<MELCloudDevice>['Name'] =
      this.buildings[buildingId]
    this.log('Getting holiday mode settings for building', buildingName, '...')
    const buildingDeviceIds: Array<MELCloudDevice['id']> = this.getDeviceIds(
      { buildingId },
      false
    )
    const { data } = await axios.get<HolidayModeData>(
      `/HolidayMode/GetSettings?tableName=DeviceLocation&id=${buildingDeviceIds[0]}`
    )
    this.log(
      'Getting holiday mode settings for building',
      buildingName,
      ':\n',
      data
    )
    return data
  }

  async updateHolidayModeSettings (
    buildingId: number,
    settings: HolidayModeSettings
  ): Promise<boolean> {
    if (!(buildingId in this.buildings)) {
      throw new Error(`Building ${buildingId} does not exist.`)
    }
    const buildingName: Building<MELCloudDevice>['Name'] =
      this.buildings[buildingId]
    const { Enabled, StartDate, EndDate } = settings
    if (Enabled && (StartDate === '' || EndDate === '')) {
      throw new Error('Start Date and/or End Date are missing.')
    }
    const utcStartDate: DateTime | null = Enabled
      ? DateTime.fromISO(StartDate).toUTC()
      : null
    const utcEndDate: DateTime | null = Enabled
      ? DateTime.fromISO(EndDate).toUTC()
      : null
    const postData: HolidayModePostData = {
      Enabled,
      StartDate:
        utcStartDate !== null
          ? {
              Year: utcStartDate.year,
              Month: utcStartDate.month,
              Day: utcStartDate.day,
              Hour: utcStartDate.hour,
              Minute: utcStartDate.minute,
              Second: utcStartDate.second
            }
          : null,
      EndDate:
        utcEndDate !== null
          ? {
              Year: utcEndDate.year,
              Month: utcEndDate.month,
              Day: utcEndDate.day,
              Hour: utcEndDate.hour,
              Minute: utcEndDate.minute,
              Second: utcEndDate.second
            }
          : null,
      HMTimeZones: [{ Buildings: [buildingId] }]
    }
    this.log(
      'Updating holiday mode settings for building',
      buildingName,
      '...\n',
      postData
    )
    const { data } = await axios.post<SuccessData>(
      '/HolidayMode/Update',
      postData
    )
    this.log(
      'Updating holiday mode settings for building',
      buildingName,
      ':\n',
      data
    )
    return this.handleFailure(data)
  }

  handleFailure (data: SuccessData): boolean {
    if (data.Success || data.AttributeErrors === null) {
      return data.Success
    }
    let errorMessage: string = ''
    for (const [error, messages] of Object.entries(data.AttributeErrors)) {
      errorMessage += `${error}: `
      for (const message of messages) {
        errorMessage += `${message} `
      }
      errorMessage = `${errorMessage.slice(0, -1)}\n`
    }
    throw new Error(errorMessage.slice(0, -1))
  }

  async listenToOutdoorTemperatureForAta (
    { capabilityPath, enabled, threshold }: OutdoorTemperatureListenerData = {
      capabilityPath:
        this.homey.settings.get('outdoor_temperature_capability_path') ?? '',
      enabled: this.homey.settings.get('self_adjust_enabled') ?? false,
      threshold: this.homey.settings.get('self_adjust_threshold') ?? 0
    }
  ): Promise<void> {
    if (enabled && (capabilityPath === '' || threshold === 0)) {
      throw new Error('Outdoor temperature and/or threshold are missing.')
    }
    const capability: string = await this.handleOutdoorTemperatureListenerData({
      capabilityPath,
      enabled,
      threshold
    })
    if (this.homey.settings.get('self_adjust_enabled') === false) {
      return
    }
    this.log(
      'Listening to outdoor temperature: listener has been created for',
      this.outdoorTemperatureDevice.name,
      '-',
      capability,
      '...'
    )
    this.outdoorTemperatureListener =
      this.outdoorTemperatureDevice.makeCapabilityInstance(
        capability,
        async (value: number): Promise<void> => {
          this.log(
            'Listening to outdoor temperature:',
            value,
            'listened from',
            this.outdoorTemperatureDevice.name,
            '-',
            capability
          )
          for (const device of this.getDevices({ driverId: 'melcloud' })) {
            if (device.getCapabilityValue('operation_mode') !== 'cool') {
              continue
            }
            await device.onCapability(
              'target_temperature',
              Math.max(threshold, Math.round(value - 8), 38)
            )
          }
        }
      )
  }

  async handleOutdoorTemperatureListenerData ({
    capabilityPath,
    enabled,
    threshold
  }: OutdoorTemperatureListenerData): Promise<string> {
    try {
      this.setSettings({ self_adjust_threshold: threshold })
      const splitCapabilityPath: string[] = capabilityPath.split(':')
      if (splitCapabilityPath.length !== 2) {
        throw new Error('The selected outdoor temperature is invalid.')
      }
      const [id, capability]: string[] = splitCapabilityPath
      // @ts-expect-error bug
      const device = await this.api.devices.getDevice({ id })
      if (device.id !== this.outdoorTemperatureDevice?.id) {
        this.outdoorTemperatureDevice = device
      }
      if (!(capability in device.capabilitiesObj)) {
        throw new Error(
          `${capability} cannot be found on ${device.name as string}.`
        )
      }
      this.setSettings({
        outdoor_temperature_capability_path: capabilityPath,
        self_adjust_enabled: enabled
      })
      return capability
    } catch (error: unknown) {
      this.error(
        'Listening to outdoor temperature:',
        error instanceof Error ? error.message : error
      )
      this.setSettings({
        outdoor_temperature_capability_path: '',
        self_adjust_enabled: false
      })
      if (capabilityPath !== '') {
        throw error
      }
      return ''
    } finally {
      this.cleanOutdoorTemperatureListener()
    }
  }

  cleanOutdoorTemperatureListener (): void {
    if (this.outdoorTemperatureListener !== null) {
      this.outdoorTemperatureListener.destroy()
    }
    if (this.outdoorTemperatureDevice !== null) {
      this.outdoorTemperatureDevice.io = null
    }
    this.log('Listening to outdoor temperature: listener has been cleaned')
  }

  async onUninit (): Promise<void> {
    this.cleanOutdoorTemperatureListener()
  }

  setSettings (settings: Settings): void {
    for (const [setting, value] of Object.entries(settings)) {
      if (value !== this.homey.settings.get(setting)) {
        this.homey.settings.set(setting, value)
      }
    }
  }

  setTimeout (
    type: string,
    callback: () => Promise<boolean>,
    interval: number | object
  ): NodeJS.Timeout {
    const duration: Duration = Duration.fromDurationLike(interval)
    this.log(
      'Next',
      type,
      'will run in',
      duration.shiftTo('days').toHuman(),
      'on',
      DateTime.now()
        .plus(duration)
        .toLocaleString(DateTime.DATETIME_HUGE_WITH_SECONDS)
    )
    return this.homey.setTimeout(callback, Number(duration))
  }
}

module.exports = MELCloudApp
