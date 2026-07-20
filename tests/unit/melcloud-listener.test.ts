import { beforeEach, describe, expect, it, vi } from 'vitest'

import type MELCloudExtensionApp from '../../app.mts'
import type { OutdoorSource } from '../../listeners/outdoor-source.mts'
import type { HomeySettings } from '../../types.mts'
import { MELCloudListener } from '../../listeners/melcloud.mts'
import { assertDefined, mock } from '../helpers.ts'
import { type MockDevice, createMockDevice, names } from '../mocks.ts'

// The capability listeners run their async bodies through
// fireAndForget: invoking one returns before the work lands, so tests
// flush a macrotask before asserting on the outcome.
const settleListeners = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

interface Harness {
  readonly app: MELCloudExtensionApp
  readonly attach: ReturnType<typeof vi.fn>
  readonly detach: ReturnType<typeof vi.fn>
  readonly listener: MELCloudListener
  readonly mockDevice: MockDevice
  readonly pushToUI: ReturnType<typeof vi.fn>
  readonly settingsStore: Partial<HomeySettings>
}

const createHarness = ({
  outdoorTemperature = 30,
  targetTemperature = 23,
  targetTemperatureMax,
  thermostatMode = 'cool',
}: {
  readonly outdoorTemperature?: number | null
  readonly targetTemperature?: number
  readonly targetTemperatureMax?: number
  readonly thermostatMode?: string
} = {}): Harness => {
  const mockDevice = createMockDevice({
    capabilities: ['target_temperature', 'thermostat_mode'],
    ...(targetTemperatureMax !== undefined && {
      capabilitiesOptions: {
        target_temperature: { max: targetTemperatureMax },
      },
    }),
    driverId: 'homey:app:com.mecloud:melcloud',
    id: 'ac-1',
    name: 'Living room',
    values: {
      target_temperature: targetTemperature,
      thermostat_mode: thermostatMode,
    },
  })
  const settingsStore: Partial<HomeySettings> = {}
  const pushToUI = vi.fn<(name: string, params?: unknown) => void>()
  const attach = vi.fn<() => Promise<void>>().mockResolvedValue()
  const detach = vi.fn<(listener: MELCloudListener) => void>()
  const app = mock<MELCloudExtensionApp>({
    api: {
      devices: {
        getCapabilityValue: vi
          .fn<
            (options: {
              capabilityId: string
            }) => boolean | number | string | null
          >()
          .mockImplementation(
            ({ capabilityId }) => mockDevice.values[capabilityId] ?? null,
          ),
      },
    },
    error: vi.fn<(...args: unknown[]) => void>(),
    homey: {
      settings: {
        get: (key: keyof HomeySettings): unknown => settingsStore[key] ?? null,
        set: (key: string, value: unknown): void => {
          Object.assign(settingsStore, { [key]: value })
        },
      },
    },
    names,
    pushToUI,
  })
  const source = mock<OutdoorSource>({
    attach,
    detach,
    value: outdoorTemperature,
  })
  const listener = new MELCloudListener(app, mockDevice.device, source)
  return {
    app,
    attach,
    detach,
    listener,
    mockDevice,
    pushToUI,
    settingsStore,
  }
}

const getInstance = (
  harness: Harness,
  capabilityId: string,
): NonNullable<ReturnType<MockDevice['capabilityInstances']['get']>> => {
  const instance = harness.mockDevice.capabilityInstances.get(capabilityId)
  assertDefined(instance)
  return instance
}

describe(MELCloudListener, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start monitoring the target temperature when already cooling', async () => {
    const harness = createHarness()

    await harness.listener.listenToThermostatMode()

    expect(harness.attach).toHaveBeenCalledWith(harness.listener)
    expect(harness.settingsStore.thresholds).toStrictEqual({ 'ac-1': 23 })
    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(23)
  })

  it('should not monitor the target temperature outside of cooling mode', async () => {
    const harness = createHarness({ thermostatMode: 'heat' })

    await harness.listener.listenToThermostatMode()

    expect(
      harness.mockDevice.capabilityInstances.has('target_temperature'),
    ).toBe(false)
    expect(harness.listener.isCooling).toBe(false)
  })

  it('should floor the target to the outdoor temperature minus the gap', async () => {
    const harness = createHarness({
      outdoorTemperature: 34.2,
      targetTemperature: 23,
    })

    await harness.listener.listenToThermostatMode()

    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(27)
  })

  it('should cap the target at the capability maximum', async () => {
    const harness = createHarness({
      outdoorTemperature: 45,
      targetTemperatureMax: 28,
    })

    await harness.listener.listenToThermostatMode()

    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(28)
  })

  it('should fall back to the hardware ceiling when the capability advertises no maximum', async () => {
    const harness = createHarness({ outdoorTemperature: 45 })

    await harness.listener.listenToThermostatMode()

    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(31)
  })

  it('should fall back to the hardware ceiling without a capabilities object', async () => {
    const harness = createHarness({ outdoorTemperature: 45 })
    Object.assign(harness.mockDevice.device, { capabilitiesObj: null })

    await harness.listener.listenToThermostatMode()

    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(31)
  })

  it('should treat a missing outdoor reading as the default temperature', async () => {
    const harness = createHarness({
      outdoorTemperature: null,
      targetTemperature: 17,
    })

    await harness.listener.listenToThermostatMode()

    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(17)
  })

  it('should save a manual target change as the new threshold', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()

    await getInstance(harness, 'target_temperature').listener(26)
    await settleListeners()

    expect(harness.settingsStore.thresholds).toStrictEqual({ 'ac-1': 26 })
    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(26)
  })

  it('should ignore a target change matching the calculated value', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()
    harness.pushToUI.mockClear()

    await getInstance(harness, 'target_temperature').listener(23)
    await settleListeners()

    expect(harness.pushToUI).toHaveBeenCalledTimes(0)
  })

  it('should start target monitoring when the mode switches to cool', async () => {
    const harness = createHarness({ thermostatMode: 'heat' })
    await harness.listener.listenToThermostatMode()

    await getInstance(harness, 'thermostat_mode').listener('cool')
    await settleListeners()

    expect(
      harness.mockDevice.capabilityInstances.has('target_temperature'),
    ).toBe(true)
    expect(harness.listener.isCooling).toBe(false)
  })

  it('should not rearm the target listener when cool is reported twice', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()
    const firstInstance = getInstance(harness, 'target_temperature')

    await getInstance(harness, 'thermostat_mode').listener('cool')
    await settleListeners()

    expect(getInstance(harness, 'target_temperature')).toBe(firstInstance)
    expect(harness.attach).toHaveBeenCalledTimes(1)
  })

  it('should revert to the default temperature when the stored threshold disappeared', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()
    Object.assign(harness.settingsStore, { thresholds: {} })

    await getInstance(harness, 'thermostat_mode').listener('heat')
    await settleListeners()

    expect(harness.mockDevice.setCapabilityValue).toHaveBeenCalledWith({
      capabilityId: 'target_temperature',
      value: 0,
    })
  })

  it('should revert the temperature and release the outdoor listener when leaving cool', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()

    await getInstance(harness, 'thermostat_mode').listener('heat')
    await settleListeners()

    expect(
      getInstance(harness, 'target_temperature').destroy,
    ).toHaveBeenCalledTimes(1)
    expect(harness.mockDevice.setCapabilityValue).toHaveBeenCalledWith({
      capabilityId: 'target_temperature',
      value: 23,
    })
    expect(harness.detach).toHaveBeenCalledWith(harness.listener)
  })

  it('should log instead of crashing when the mode-switch work fails', async () => {
    const harness = createHarness({ thermostatMode: 'heat' })
    await harness.listener.listenToThermostatMode()
    harness.attach.mockRejectedValueOnce(new Error('offline'))

    await getInstance(harness, 'thermostat_mode').listener('cool')
    await settleListeners()

    expect(harness.app.error).toHaveBeenCalledWith('offline')
  })

  it('should log instead of crashing when the threshold recalculation fails', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()
    getInstance(harness, 'target_temperature').setValue.mockRejectedValueOnce(
      new Error('offline'),
    )

    await getInstance(harness, 'target_temperature').listener(26)
    await settleListeners()

    expect(harness.app.error).toHaveBeenCalledWith('offline')
  })

  it('should report the device as missing when the revert fails', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()
    harness.mockDevice.setCapabilityValue.mockRejectedValueOnce(
      new Error('gone'),
    )

    await getInstance(harness, 'thermostat_mode').listener('heat')
    await settleListeners()

    expect(harness.pushToUI).toHaveBeenCalledWith('error.notFound', {
      idOrName: 'Living room',
      type: 'Device',
    })
  })

  it('should report cooling from the live thermostat mode', async () => {
    const harness = createHarness()

    await harness.listener.listenToThermostatMode()

    expect(harness.listener.isCooling).toBe(true)
  })

  it('should destroy both capability listeners and revert', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()

    await harness.listener.destroy()

    expect(
      getInstance(harness, 'target_temperature').destroy,
    ).toHaveBeenCalledTimes(1)
    expect(
      getInstance(harness, 'thermostat_mode').destroy,
    ).toHaveBeenCalledTimes(1)
    expect(harness.mockDevice.setCapabilityValue).toHaveBeenCalledWith({
      capabilityId: 'target_temperature',
      value: 23,
    })
  })

  it('should ignore recalculations while not monitoring', async () => {
    const harness = createHarness()

    await harness.listener.setTargetTemperature()

    expect(harness.pushToUI).toHaveBeenCalledTimes(0)
  })

  it('should stay destroyable before any listening started', async () => {
    const harness = createHarness()

    await harness.listener.destroy()

    expect(harness.pushToUI).toHaveBeenCalledWith('cleaned', {
      capability: names.thermostatMode,
      name: 'Living room',
    })
  })
})
