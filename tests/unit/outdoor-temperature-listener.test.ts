import { beforeEach, describe, expect, it, vi } from 'vitest'

import type MELCloudExtensionApp from '../../app.mts'
import type { HomeySettings } from '../../types.mts'
import { OutdoorTemperatureListener } from '../../listeners/outdoor-temperature.mts'
import { assertDefined, mock } from '../helpers.ts'
import {
  type MockDevice,
  createMockDevice,
  createMockDevicesManager,
  names,
} from '../mocks.ts'

const OUTDOOR_PATH = 'sensor-1:measure_temperature.outdoor'

interface Harness {
  readonly app: MELCloudExtensionApp
  readonly coolingDevice: MockDevice
  readonly heatingDevice: MockDevice
  readonly pushToUI: ReturnType<typeof vi.fn>
  readonly sensorDevice: MockDevice
  readonly settingsStore: Partial<HomeySettings>
}

const createHarness = (): Harness => {
  const coolingDevice = createMockDevice({
    capabilities: ['target_temperature', 'thermostat_mode'],
    driverId: 'homey:app:com.mecloud:melcloud',
    id: 'ac-cooling',
    name: 'Living room',
    values: { target_temperature: 23, thermostat_mode: 'cool' },
  })
  const heatingDevice = createMockDevice({
    capabilities: ['target_temperature', 'thermostat_mode'],
    driverId: 'homey:app:com.mecloud:home-melcloud',
    id: 'ac-heating',
    name: 'Bedroom',
    values: { target_temperature: 21, thermostat_mode: 'heat' },
  })
  const sensorDevice = createMockDevice({
    capabilities: ['measure_temperature.outdoor'],
    driverId: 'homey:app:com.mecloud:melcloud',
    id: 'sensor-1',
    name: 'Outdoor unit',
    values: { 'measure_temperature.outdoor': 30 },
  })
  const { manager } = createMockDevicesManager([
    coolingDevice,
    heatingDevice,
    sensorDevice,
  ])
  const settingsStore: Partial<HomeySettings> = {}
  const pushToUI = vi.fn<(name: string, params?: unknown) => void>()
  const app = mock<MELCloudExtensionApp>({
    api: { devices: manager },
    homey: {
      settings: {
        get: (key: keyof HomeySettings): unknown => settingsStore[key] ?? null,
        set: (key: string, value: unknown): void => {
          Object.assign(settingsStore, { [key]: value })
        },
      },
    },
    melcloudDevices: [coolingDevice.device, heatingDevice.device],
    names,
    pushToUI,
  })
  return {
    app,
    coolingDevice,
    heatingDevice,
    pushToUI,
    sensorDevice,
    settingsStore,
  }
}

describe(OutdoorTemperatureListener, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject an unknown device in the capability path', async () => {
    const harness = createHarness()

    await expect(
      OutdoorTemperatureListener.create(harness.app, {
        capabilityPath: 'missing:measure_temperature',
        isEnabled: true,
      }),
    ).rejects.toThrow('error.notFound')

    expect(harness.settingsStore.capabilityPath).toBeUndefined()
  })

  it('should reject an unknown capability in the capability path', async () => {
    const harness = createHarness()

    await expect(
      OutdoorTemperatureListener.create(harness.app, {
        capabilityPath: 'sensor-1:missing_capability',
        isEnabled: true,
      }),
    ).rejects.toThrow('error.notFound')
  })

  it('should reject the placeholder path used before configuration', async () => {
    const harness = createHarness()

    await expect(
      OutdoorTemperatureListener.create(harness.app, {
        capabilityPath: ':',
        isEnabled: true,
      }),
    ).rejects.toThrow('error.notFound')
  })

  it('should persist the settings without listening when disabled', async () => {
    const harness = createHarness()

    const listener = await OutdoorTemperatureListener.create(harness.app, {
      capabilityPath: OUTDOOR_PATH,
      isEnabled: false,
    })

    expect(harness.settingsStore.capabilityPath).toBe(OUTDOOR_PATH)
    expect(harness.settingsStore.isEnabled).toBe(false)
    expect(listener.value).toBeNull()
    expect(harness.coolingDevice.capabilityInstances.size).toBe(0)
  })

  it('should listen to every AC device and monitor the outdoor sensor when enabled', async () => {
    const harness = createHarness()

    const listener = await OutdoorTemperatureListener.create(harness.app, {
      capabilityPath: OUTDOOR_PATH,
      isEnabled: true,
    })

    expect(
      harness.coolingDevice.capabilityInstances.has('thermostat_mode'),
    ).toBe(true)
    expect(
      harness.heatingDevice.capabilityInstances.has('thermostat_mode'),
    ).toBe(true)
    expect(
      harness.coolingDevice.capabilityInstances.has('target_temperature'),
    ).toBe(true)
    expect(
      harness.heatingDevice.capabilityInstances.has('target_temperature'),
    ).toBe(false)
    expect(listener.value).toBe(30)
  })

  it('should recalculate every cooling device when the outdoor temperature changes', async () => {
    const harness = createHarness()
    const listener = await OutdoorTemperatureListener.create(harness.app, {
      capabilityPath: OUTDOOR_PATH,
      isEnabled: true,
    })
    const outdoorInstance = harness.sensorDevice.capabilityInstances.get(
      'measure_temperature.outdoor',
    )
    assertDefined(outdoorInstance)
    const targetInstance =
      harness.coolingDevice.capabilityInstances.get('target_temperature')
    assertDefined(targetInstance)
    targetInstance.setValue.mockClear()

    await outdoorInstance.listener(38.4)

    expect(listener.value).toBe(38.4)
    expect(targetInstance.setValue).toHaveBeenCalledWith(31)
  })

  it('should not rearm the outdoor listener when a second device starts cooling', async () => {
    const harness = createHarness()
    await OutdoorTemperatureListener.create(harness.app, {
      capabilityPath: OUTDOOR_PATH,
      isEnabled: true,
    })
    const heatingThermostat =
      harness.heatingDevice.capabilityInstances.get('thermostat_mode')
    assertDefined(heatingThermostat)
    const outdoorInstance = harness.sensorDevice.capabilityInstances.get(
      'measure_temperature.outdoor',
    )
    assertDefined(outdoorInstance)

    await heatingThermostat.listener('cool')

    expect(
      harness.sensorDevice.capabilityInstances.get(
        'measure_temperature.outdoor',
      ),
    ).toBe(outdoorInstance)
    expect(
      harness.heatingDevice.capabilityInstances.has('target_temperature'),
    ).toBe(true)
  })

  it('should keep the outdoor listener while another device is cooling', async () => {
    const harness = createHarness()
    await OutdoorTemperatureListener.create(harness.app, {
      capabilityPath: OUTDOOR_PATH,
      isEnabled: true,
    })
    const heatingThermostat =
      harness.heatingDevice.capabilityInstances.get('thermostat_mode')
    assertDefined(heatingThermostat)

    await heatingThermostat.listener('heat')

    const outdoorInstance = harness.sensorDevice.capabilityInstances.get(
      'measure_temperature.outdoor',
    )
    assertDefined(outdoorInstance)

    expect(outdoorInstance.destroy).toHaveBeenCalledTimes(0)
  })

  it('should release the outdoor listener when the last cooling device stops', async () => {
    const harness = createHarness()
    await OutdoorTemperatureListener.create(harness.app, {
      capabilityPath: OUTDOOR_PATH,
      isEnabled: true,
    })
    const coolingThermostat =
      harness.coolingDevice.capabilityInstances.get('thermostat_mode')
    assertDefined(coolingThermostat)

    await coolingThermostat.listener('heat')

    const outdoorInstance = harness.sensorDevice.capabilityInstances.get(
      'measure_temperature.outdoor',
    )
    assertDefined(outdoorInstance)

    expect(outdoorInstance.destroy).toHaveBeenCalledTimes(1)
  })

  it('should destroy the device listeners and release the sensor', async () => {
    const harness = createHarness()
    const listener = await OutdoorTemperatureListener.create(harness.app, {
      capabilityPath: OUTDOOR_PATH,
      isEnabled: true,
    })

    await listener.destroy()

    const coolingThermostat =
      harness.coolingDevice.capabilityInstances.get('thermostat_mode')
    assertDefined(coolingThermostat)
    const outdoorInstance = harness.sensorDevice.capabilityInstances.get(
      'measure_temperature.outdoor',
    )
    assertDefined(outdoorInstance)

    expect(coolingThermostat.destroy).toHaveBeenCalledTimes(1)
    expect(outdoorInstance.destroy).toHaveBeenCalledTimes(1)
    expect(harness.pushToUI).toHaveBeenCalledWith('cleaned', {
      capability: names.temperature,
      name: 'Outdoor unit',
    })
  })
})
