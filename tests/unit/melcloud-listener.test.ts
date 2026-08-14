import { beforeEach, describe, expect, it, vi } from 'vitest'

import type MELCloudExtensionApp from '../../app.mts'
import type { OutdoorSource } from '../../listeners/outdoor-source.mts'
import type {
  Adjustment,
  Adjustments,
  HomeySettings,
  Thresholds,
} from '../../types.mts'
import { toAdjustments } from '../../lib/to-adjustments.mts'
import { toThresholds } from '../../lib/to-thresholds.mts'
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
  readonly revertAdjustment: ReturnType<typeof vi.fn>
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
  // Settling is the app's job: the listener's contract is to ask for it,
  // which is what these tests pin. The settlement itself lives in
  // `app.test.ts`, where its live-state checks belong.
  const revertAdjustment = vi
    .fn<(device: unknown) => Promise<void>>()
    .mockResolvedValue()
  const recordAdjustment = vi
    .fn<(deviceId: string, adjustment: Adjustment) => void>()
    .mockImplementation((deviceId, adjustment) => {
      Object.assign(settingsStore, {
        adjustments: { ...settingsStore.adjustments, [deviceId]: adjustment },
      })
    })
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
    recordAdjustment,
    revertAdjustment,
    // The accessor PAIR, not a snapshot: tests mutate settingsStore
    // mid-run and the listener must see it, and it writes back through
    // the setter — exactly as the real app does.
    get adjustments(): Adjustments {
      return toAdjustments(settingsStore.adjustments) ?? {}
    },
    get thresholds(): Thresholds {
      return toThresholds(settingsStore.thresholds) ?? {}
    },
    set thresholds(value: Thresholds) {
      Object.assign(settingsStore, { thresholds: value })
    },
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
    revertAdjustment,
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
  })

  it('should floor the target to the outdoor temperature minus the gap, half-degree precise', async () => {
    const harness = createHarness({
      outdoorTemperature: 34.2,
      targetTemperature: 23,
    })

    await harness.listener.listenToThermostatMode()

    // 34.2 ceils to the wire's next half degree (34.5), not to 35: the
    // floor hugs the outdoor reading while the gap stays <= 8.
    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(26.5)
  })

  it('should keep a whole-degree outdoor reading on whole degrees', async () => {
    const harness = createHarness({
      outdoorTemperature: 34,
      targetTemperature: 23,
    })

    await harness.listener.listenToThermostatMode()

    expect(
      getInstance(harness, 'target_temperature').setValue,
    ).toHaveBeenCalledWith(26)
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

  it('should fall back to the stored threshold when the outdoor reading is missing', async () => {
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

  // Nothing constrains the target: no stored setpoint and no reading.
  // Math.max of no floor is -Infinity, so refusing is the only honest
  // answer — this is the branch the old 0 °C stand-in hid.
  it('should write nothing when neither a threshold nor a reading is known', async () => {
    const harness = createHarness({ outdoorTemperature: null })
    await harness.listener.listenToThermostatMode()
    // Attaching seeds the threshold from the device's current setpoint,
    // so both the store and that first write are cleared first.
    Object.assign(harness.settingsStore, { thresholds: {} })
    const instance = getInstance(harness, 'target_temperature')
    instance.setValue.mockClear()
    harness.pushToUI.mockClear()

    await harness.listener.setTargetTemperature()

    expect(instance.setValue).not.toHaveBeenCalled()
    expect(harness.pushToUI).toHaveBeenCalledWith('error.noThreshold', {
      name: 'Living room',
    })
  })

  it('should still owe the debt when the stored threshold is corrupt', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()
    Object.assign(harness.settingsStore, { thresholds: { 'ac-1': 'warm' } })

    await getInstance(harness, 'thermostat_mode').listener('heat')
    await settleListeners()

    // The debt is recorded independently of the threshold map, which is
    // exactly what a dropped threshold entry used to disarm.
    expect(harness.settingsStore.adjustments).toStrictEqual({
      'ac-1': { previous: 23, written: 23 },
    })
    expect(harness.revertAdjustment).toHaveBeenCalledWith(
      harness.mockDevice.device,
    )
  })

  // The path a crash-restart takes: the app comes back with its own
  // auto-calculated value still on the unit, and must not mistake it for
  // a setpoint the user chose.
  it('should reclaim the comfort value when the device still holds our write', async () => {
    const harness = createHarness({ targetTemperature: 26 })
    Object.assign(harness.settingsStore, {
      adjustments: { 'ac-1': { previous: 21, written: 26 } },
    })

    await harness.listener.listenToThermostatMode()

    expect(harness.settingsStore.thresholds).toStrictEqual({ 'ac-1': 21 })
  })

  it('should adopt a setpoint the user moved while the app was away', async () => {
    const harness = createHarness({ targetTemperature: 24 })
    Object.assign(harness.settingsStore, {
      adjustments: { 'ac-1': { previous: 21, written: 26 } },
    })

    await harness.listener.listenToThermostatMode()

    expect(harness.settingsStore.thresholds).toStrictEqual({ 'ac-1': 24 })
  })

  it('should record the written value as the debt', async () => {
    const harness = createHarness({ outdoorTemperature: 38 })

    await harness.listener.listenToThermostatMode()

    expect(harness.settingsStore.adjustments).toStrictEqual({
      'ac-1': { previous: 23, written: 30 },
    })
  })

  it('should leave an unreadable setpoint alone instead of adjusting it', async () => {
    const harness = createHarness()
    harness.mockDevice.values.target_temperature = null

    await harness.listener.listenToThermostatMode()

    expect(
      harness.mockDevice.capabilityInstances.has('target_temperature'),
    ).toBe(false)
    expect(harness.settingsStore.adjustments).toBeUndefined()
    expect(harness.pushToUI).toHaveBeenCalledWith('error.noThreshold', {
      name: 'Living room',
    })
    expect(harness.detach).toHaveBeenCalledWith(harness.listener)
  })

  it('should ignore a manual setpoint that is not a temperature', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()
    harness.pushToUI.mockClear()

    await getInstance(harness, 'target_temperature').listener('warm')
    await settleListeners()

    expect(harness.pushToUI).not.toHaveBeenCalled()
    expect(harness.settingsStore.thresholds).toStrictEqual({ 'ac-1': 23 })
  })

  it('should restart the debt when its record vanished mid-write', async () => {
    const harness = createHarness({ outdoorTemperature: 38 })
    await harness.listener.listenToThermostatMode()
    Reflect.deleteProperty(harness.settingsStore, 'adjustments')

    await harness.listener.setTargetTemperature()

    expect(harness.settingsStore.adjustments).toStrictEqual({
      'ac-1': { previous: 30, written: 30 },
    })
  })

  it('should ask the app to settle and release the outdoor listener when leaving cool', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()

    await getInstance(harness, 'thermostat_mode').listener('heat')
    await settleListeners()

    expect(
      getInstance(harness, 'target_temperature').destroy,
    ).toHaveBeenCalledTimes(1)
    expect(harness.revertAdjustment).toHaveBeenCalledWith(
      harness.mockDevice.device,
    )
    expect(harness.detach).toHaveBeenCalledWith(harness.listener)
  })

  it('should log instead of crashing when the mode-switch work fails', async () => {
    const harness = createHarness({ thermostatMode: 'heat' })
    await harness.listener.listenToThermostatMode()
    harness.attach.mockRejectedValueOnce(new Error('offline'))

    await getInstance(harness, 'thermostat_mode').listener('cool')
    await settleListeners()

    expect(harness.app.error).toHaveBeenCalledWith(
      'Failed to handle a thermostat mode change',
      new Error('offline'),
    )
  })

  it('should log instead of crashing when the threshold recalculation fails', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()
    getInstance(harness, 'target_temperature').setValue.mockRejectedValueOnce(
      new Error('offline'),
    )

    await getInstance(harness, 'target_temperature').listener(26)
    await settleListeners()

    expect(harness.app.error).toHaveBeenCalledWith(
      'Failed to set the temperature threshold',
      new Error('offline'),
    )
  })

  it('should destroy both capability listeners and ask for a settlement', async () => {
    const harness = createHarness()
    await harness.listener.listenToThermostatMode()

    await harness.listener.destroy()

    expect(
      getInstance(harness, 'target_temperature').destroy,
    ).toHaveBeenCalledTimes(1)
    expect(
      getInstance(harness, 'thermostat_mode').destroy,
    ).toHaveBeenCalledTimes(1)
    expect(harness.revertAdjustment).toHaveBeenCalledWith(
      harness.mockDevice.device,
    )
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
