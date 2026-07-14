import type * as HomeyApi from 'homey-api'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as HomeyLib from '../../lib/homey.mts'
import type { TimestampedLog } from '../../types.mts'
import { changelog } from '../../files.mts'
import { assertDefined } from '../helpers.ts'
import {
  type MockDevice,
  type MockHomey,
  createApiCall,
  createMockDevice,
  createMockDevicesManager,
  createMockHomey,
} from '../mocks.ts'
import MELCloudExtensionApp from '../../app.mts'

const { createAppAPIMock } = vi.hoisted(() => ({
  createAppAPIMock: vi.fn<() => Promise<unknown>>(),
}))

vi.mock(import('../../lib/homey.mts'), async () => {
  const { mock: mockModule } = await import('../helpers.ts')
  class AppStub {
    public readonly error = vi.fn<(...args: unknown[]) => void>()
  }
  return mockModule<typeof HomeyLib>({ App: AppStub })
})

vi.mock(import('homey-api'), async () => {
  const { mock: mockModule } = await import('../helpers.ts')
  return mockModule<typeof HomeyApi>({
    HomeyAPIV3Local: { createAppAPI: createAppAPIMock },
  })
})

const INIT_DELAY = 1000
const NOTIFICATION_DELAY = 10_000

const LATEST_VERSION = Object.keys(changelog).at(-1) ?? ''

interface Harness {
  readonly apiCall: ReturnType<typeof vi.fn>
  readonly app: MELCloudExtensionApp
  readonly manager: ReturnType<typeof createMockDevicesManager>
  readonly mockHomey: MockHomey
}

const createDevices = (): {
  classicDevice: MockDevice
  homeDevice: MockDevice
  sensorDevice: MockDevice
} => ({
  classicDevice: createMockDevice({
    capabilities: [
      'measure_temperature',
      'measure_temperature.outdoor',
      'target_temperature',
      'thermostat_mode',
    ],
    driverId: 'homey:app:com.mecloud:melcloud',
    id: 'classic-1',
    name: 'Living room',
    values: {
      'measure_temperature.outdoor': 30,
      target_temperature: 23,
      thermostat_mode: 'cool',
    },
  }),
  homeDevice: createMockDevice({
    capabilities: [
      'measure_temperature',
      'target_temperature',
      'thermostat_mode',
    ],
    driverId: 'homey:app:com.mecloud:home-melcloud',
    id: 'home-1',
    name: 'Bedroom',
    values: { target_temperature: 21, thermostat_mode: 'heat' },
  }),
  sensorDevice: createMockDevice({
    capabilities: ['measure_power'],
    driverId: 'homey:app:com.other:plug',
    id: 'plug-1',
    name: 'Plug',
  }),
})

const createHarness = async (
  mockDevices: readonly MockDevice[],
  {
    settings = {},
    version = '0.0.0',
  }: {
    readonly settings?: Parameters<typeof createMockHomey>[0] extends (
      { settings?: infer TSettings } | undefined
    ) ?
      TSettings
    : never
    readonly version?: string
  } = {},
): Promise<Harness> => {
  const manager = createMockDevicesManager(mockDevices)
  const mockHomey = createMockHomey({ settings, version })
  const apiCall = createApiCall()
  createAppAPIMock.mockResolvedValue({
    call: apiCall,
    devices: manager.manager,
  })
  const app = new MELCloudExtensionApp()
  Object.assign(app, { homey: mockHomey.homey })
  await app.onInit()
  return { apiCall, app, manager, mockHomey }
}

const advancePastInit = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(INIT_DELAY)
}

describe(MELCloudExtensionApp, () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should expose the building grouping fetched from com.melcloud', async () => {
    const { classicDevice } = createDevices()
    const groups = [{ deviceIds: ['classic-1'], name: 'Domicile' }]
    const { app, mockHomey } = await createHarness([classicDevice])
    mockHomey.apiAppGet.mockReturnValue(groups)

    await advancePastInit()

    expect(mockHomey.apiAppGet).toHaveBeenCalledWith('/device_groups')
    expect(app.deviceGroups).toStrictEqual(groups)
  })

  it('should re-read the grouping on demand, following a rename', async () => {
    const { classicDevice } = createDevices()
    const { app, mockHomey } = await createHarness([classicDevice])
    mockHomey.apiAppGet.mockReturnValue([
      { deviceIds: ['classic-1'], name: 'Domicile' },
    ])

    await advancePastInit()

    mockHomey.apiAppGet.mockReturnValue([
      { deviceIds: ['classic-1'], name: 'Nouvelle maison' },
    ])

    await expect(app.refreshDeviceGroups()).resolves.toStrictEqual([
      { deviceIds: ['classic-1'], name: 'Nouvelle maison' },
    ])
    expect(app.deviceGroups).toStrictEqual([
      { deviceIds: ['classic-1'], name: 'Nouvelle maison' },
    ])
  })

  it('should read an off-shape grouping payload as no grouping', async () => {
    const { classicDevice } = createDevices()
    const { app, mockHomey } = await createHarness([classicDevice])
    mockHomey.apiAppGet.mockReturnValue('nonsense')

    await advancePastInit()

    expect(app.deviceGroups).toBeNull()
  })

  it('should read a failed grouping fetch as no grouping', async () => {
    const { classicDevice } = createDevices()
    const { app, mockHomey } = await createHarness([classicDevice])
    mockHomey.apiAppGet.mockRejectedValue(new Error('not_installed'))

    await advancePastInit()

    expect(app.deviceGroups).toBeNull()
  })

  it('should classify Classic and Home AC devices as adjustable', async () => {
    const { classicDevice, homeDevice, sensorDevice } = createDevices()
    const { app } = await createHarness([
      classicDevice,
      homeDevice,
      sensorDevice,
    ])

    await advancePastInit()

    expect(app.melcloudDevices.map(({ id }) => id)).toStrictEqual([
      'classic-1',
      'home-1',
    ])
    expect(app.temperatureSensors.map(({ id }) => id)).toStrictEqual([
      'classic-1',
      'home-1',
    ])
  })

  it('should adjust a Home-only account via the Homey weather by default', async () => {
    const { homeDevice } = createDevices()
    homeDevice.values.thermostat_mode = 'cool'
    const { apiCall } = await createHarness([homeDevice], {
      settings: { isEnabled: true },
    })

    await advancePastInit()

    expect(apiCall).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/manager/weather/weather',
    })
    expect(homeDevice.capabilityInstances.has('target_temperature')).toBe(true)
    expect(
      homeDevice.capabilityInstances.get('target_temperature')?.setValue,
    ).toHaveBeenCalledWith(22)
  })

  it('should start auto-adjustment on the configured capability when enabled', async () => {
    const { classicDevice } = createDevices()
    const { apiCall } = await createHarness([classicDevice], {
      settings: {
        isEnabled: true,
        outdoorSources: {
          'classic-1': 'classic-1:measure_temperature.outdoor',
        },
      },
    })

    await advancePastInit()

    expect(classicDevice.capabilityInstances.has('thermostat_mode')).toBe(true)
    expect(classicDevice.capabilityInstances.has('target_temperature')).toBe(
      true,
    )
    expect(apiCall).toHaveBeenCalledTimes(0)
  })

  it('should keep adjusting the other devices when one source is invalid', async () => {
    const { classicDevice, homeDevice } = createDevices()
    homeDevice.values.thermostat_mode = 'cool'
    const { mockHomey } = await createHarness([classicDevice, homeDevice], {
      settings: {
        isEnabled: true,
        outdoorSources: { 'classic-1': 'missing:capability' },
      },
    })

    await advancePastInit()

    const lastLogs = mockHomey.settingsStore.lastLogs ?? []

    expect(lastLogs.some(({ category }) => category === 'error')).toBe(true)
    expect(classicDevice.capabilityInstances.has('thermostat_mode')).toBe(false)
    expect(homeDevice.capabilityInstances.has('target_temperature')).toBe(true)
  })

  it('should share one weather source across the devices using it', async () => {
    const { classicDevice, homeDevice } = createDevices()
    classicDevice.values.thermostat_mode = 'cool'
    homeDevice.values.thermostat_mode = 'cool'
    const { apiCall } = await createHarness([classicDevice, homeDevice], {
      settings: { isEnabled: true },
    })

    await advancePastInit()

    expect(apiCall).toHaveBeenCalledTimes(1)
    expect(classicDevice.capabilityInstances.has('target_temperature')).toBe(
      true,
    )
    expect(homeDevice.capabilityInstances.has('target_temperature')).toBe(true)
  })

  it('should leave a device opted out with the disabled source alone', async () => {
    const { classicDevice, homeDevice } = createDevices()
    classicDevice.values.thermostat_mode = 'cool'
    homeDevice.values.thermostat_mode = 'cool'
    await createHarness([classicDevice, homeDevice], {
      settings: {
        isEnabled: true,
        outdoorSources: { 'classic-1': 'none' },
      },
    })

    await advancePastInit()

    expect(classicDevice.capabilityInstances.size).toBe(0)
    expect(homeDevice.capabilityInstances.has('target_temperature')).toBe(true)
  })

  it('should persist the settings without listening when disabled', async () => {
    const { classicDevice } = createDevices()
    const { mockHomey } = await createHarness([classicDevice])

    await advancePastInit()

    expect(mockHomey.settingsStore.isEnabled).toBe(false)
    expect(mockHomey.settingsStore.outdoorSources).toStrictEqual({})
    expect(classicDevice.capabilityInstances.size).toBe(0)
  })

  it('should migrate the legacy global source to every AC device', async () => {
    const { classicDevice, homeDevice } = createDevices()
    const { mockHomey } = await createHarness([classicDevice, homeDevice], {
      settings: { capabilityPath: 'classic-1:measure_temperature.outdoor' },
    })

    await advancePastInit()

    expect(mockHomey.settingsStore.capabilityPath).toBeUndefined()
    expect(mockHomey.settingsStore.outdoorSources).toStrictEqual({
      'classic-1': 'classic-1:measure_temperature.outdoor',
      'home-1': 'classic-1:measure_temperature.outdoor',
    })
  })

  it('should drop the legacy source when per-device sources already exist', async () => {
    const { classicDevice } = createDevices()
    const { mockHomey } = await createHarness([classicDevice], {
      settings: {
        capabilityPath: 'classic-1:measure_temperature.outdoor',
        outdoorSources: { 'classic-1': null },
      },
    })

    await advancePastInit()

    expect(mockHomey.settingsStore.capabilityPath).toBeUndefined()
    expect(mockHomey.settingsStore.outdoorSources).toStrictEqual({
      'classic-1': null,
    })
  })

  it('should coalesce rapid device events into one reload', async () => {
    const { classicDevice } = createDevices()
    const { manager } = await createHarness([classicDevice])
    await advancePastInit()
    const createHandler = manager.eventHandlers.get('device.create')
    const deleteHandler = manager.eventHandlers.get('device.delete')
    assertDefined(createHandler)
    assertDefined(deleteHandler)
    manager.getDevices.mockClear()

    createHandler()
    deleteHandler()
    await advancePastInit()

    expect(manager.getDevices).toHaveBeenCalledTimes(1)
  })

  it('should surface non-listener startup failures as logs', async () => {
    const { classicDevice } = createDevices()
    const { manager, mockHomey } = await createHarness([classicDevice], {
      settings: {
        isEnabled: true,
        outdoorSources: {
          'classic-1': 'classic-1:measure_temperature.outdoor',
        },
      },
    })
    manager.getCapabilityValue.mockRejectedValueOnce(new Error('api_down'))

    await advancePastInit()

    const lastLogs = mockHomey.settingsStore.lastLogs ?? []

    expect(lastLogs[0]?.message).toBe('log.api_down')
  })

  it('should parse log names into category and message', async () => {
    const { classicDevice } = createDevices()
    const { app, mockHomey } = await createHarness([classicDevice])

    app.pushToUI('cleanedAll')
    app.pushToUI('error.notFound', { idOrName: 'x', type: 'Device' })

    const [firstLog] = mockHomey.realtime.mock.calls.map(
      ([, log]) => log as TimestampedLog,
    )

    expect(firstLog?.category).toBe('cleanedAll')
    expect(firstLog?.message).toBe('log.cleanedAll')
    expect(
      (mockHomey.settingsStore.lastLogs ?? []).map(({ category }) => category),
    ).toStrictEqual(['error', 'cleanedAll'])
  })

  it('should fall back to the message id when the translation is empty', async () => {
    const { classicDevice } = createDevices()
    const { app, mockHomey } = await createHarness([classicDevice])
    mockHomey.translate.mockReturnValueOnce('')

    app.pushToUI('saved')

    const [lastLog] = mockHomey.settingsStore.lastLogs ?? []

    expect(lastLog?.message).toBe('saved')
  })

  it('should fix the i18n contraction glitches', async () => {
    const { classicDevice } = createDevices()
    const { app, mockHomey } = await createHarness([classicDevice])
    mockHomey.translate.mockReturnValueOnce(
      'Temperatura de el exterior de le salon',
    )

    app.pushToUI('calculated')

    const [lastLog] = mockHomey.settingsStore.lastLogs ?? []

    expect(lastLog?.message).toBe('Temperatura del exterior du salon')
  })

  it('should cap the persisted log history', async () => {
    const { classicDevice } = createDevices()
    const seededLogs = Array.from({ length: 100 }, (_element, index) => ({
      category: 'saved',
      message: `log ${String(index)}`,
      time: index,
    }))
    const { app, mockHomey } = await createHarness([classicDevice], {
      settings: { lastLogs: seededLogs },
    })

    app.pushToUI('cleanedAll')

    const lastLogs = mockHomey.settingsStore.lastLogs ?? []

    expect(lastLogs).toHaveLength(100)
    expect(lastLogs[0]?.message).toBe('log.cleanedAll')
  })

  it('should notify once about the installed version changelog', async () => {
    const { classicDevice } = createDevices()
    const { mockHomey } = await createHarness([classicDevice], {
      version: LATEST_VERSION,
    })

    await vi.advanceTimersByTimeAsync(NOTIFICATION_DELAY)

    expect(mockHomey.createNotification).toHaveBeenCalledTimes(1)
    expect(mockHomey.settingsStore.notifiedVersion).toBe(LATEST_VERSION)
  })

  it('should not notify again for an already notified version', async () => {
    const { classicDevice } = createDevices()
    const { mockHomey } = await createHarness([classicDevice], {
      settings: { notifiedVersion: LATEST_VERSION },
      version: LATEST_VERSION,
    })

    await vi.advanceTimersByTimeAsync(NOTIFICATION_DELAY)

    expect(mockHomey.createNotification).toHaveBeenCalledTimes(0)
  })

  it('should not notify when the version has no changelog entry', async () => {
    const { classicDevice } = createDevices()
    const { mockHomey } = await createHarness([classicDevice], {
      version: '0.0.0',
    })

    await vi.advanceTimersByTimeAsync(NOTIFICATION_DELAY)

    expect(mockHomey.createNotification).toHaveBeenCalledTimes(0)
  })

  it('should keep the version unnotified when the notification fails', async () => {
    const { classicDevice } = createDevices()
    const { mockHomey } = await createHarness([classicDevice], {
      version: LATEST_VERSION,
    })
    mockHomey.createNotification.mockRejectedValueOnce(new Error('offline'))

    await vi.advanceTimersByTimeAsync(NOTIFICATION_DELAY)

    expect(mockHomey.settingsStore.notifiedVersion).toBeUndefined()
  })

  it('should destroy the listeners on uninit', async () => {
    const { classicDevice } = createDevices()
    const { app, mockHomey } = await createHarness([classicDevice], {
      settings: {
        isEnabled: true,
        outdoorSources: {
          'classic-1': 'classic-1:measure_temperature.outdoor',
        },
      },
    })
    await advancePastInit()
    const thermostatInstance =
      classicDevice.capabilityInstances.get('thermostat_mode')
    assertDefined(thermostatInstance)

    await app.onUninit()

    expect(thermostatInstance.destroy).toHaveBeenCalledTimes(1)

    const lastLogs = mockHomey.settingsStore.lastLogs ?? []

    expect(lastLogs.at(-1)?.category).toBe('cleanedAll')
  })

  it('should clean up on unload and surface cleanup failures', async () => {
    const { classicDevice } = createDevices()
    const { app, mockHomey } = await createHarness([classicDevice])
    const unloadHandler = mockHomey.eventHandlers.get('unload')
    assertDefined(unloadHandler)
    mockHomey.realtime.mockImplementationOnce(() => {
      throw new Error('realtime_down')
    })

    unloadHandler()
    await vi.advanceTimersByTimeAsync(0)

    expect(app.error).toHaveBeenCalledWith('realtime_down')
  })

  it('should expose the localized names', async () => {
    const { classicDevice } = createDevices()
    const { app } = await createHarness([classicDevice])

    expect(app.names).toStrictEqual({
      device: 'names.device',
      homeyWeather: 'names.homeyWeather',
      outdoorTemperature: 'names.outdoorTemperature',
      temperature: 'names.temperature',
      thermostatMode: 'names.thermostatMode',
    })
  })
})
