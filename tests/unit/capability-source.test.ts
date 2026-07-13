import { beforeEach, describe, expect, it, vi } from 'vitest'

import type MELCloudExtensionApp from '../../app.mts'
import type { MELCloudListener } from '../../listeners/melcloud.mts'
import { CapabilityOutdoorSource } from '../../listeners/capability-source.mts'
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
  readonly pushToUI: ReturnType<typeof vi.fn>
  readonly sensorDevice: MockDevice
}

const createHarness = (): Harness => {
  const sensorDevice = createMockDevice({
    capabilities: ['measure_temperature.outdoor'],
    driverId: 'homey:app:com.mecloud:melcloud',
    id: 'sensor-1',
    name: 'Outdoor unit',
    values: { 'measure_temperature.outdoor': 30 },
  })
  const { manager } = createMockDevicesManager([sensorDevice])
  const pushToUI = vi.fn<(name: string, params?: unknown) => void>()
  const app = mock<MELCloudExtensionApp>({
    api: { devices: manager },
    names,
    pushToUI,
  })
  return { app, pushToUI, sensorDevice }
}

const createSubscriber = (): MELCloudListener =>
  mock<MELCloudListener>({
    setTargetTemperature: vi.fn<() => Promise<void>>().mockResolvedValue(),
  })

const getOutdoorInstance = (
  harness: Harness,
): NonNullable<ReturnType<MockDevice['capabilityInstances']['get']>> => {
  const instance = harness.sensorDevice.capabilityInstances.get(
    'measure_temperature.outdoor',
  )
  assertDefined(instance)
  return instance
}

describe(CapabilityOutdoorSource, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject an unknown device in the capability path', async () => {
    const harness = createHarness()

    await expect(
      CapabilityOutdoorSource.create(harness.app, 'missing:capability'),
    ).rejects.toThrow('error.notFound')
  })

  it('should reject an unknown capability in the capability path', async () => {
    const harness = createHarness()

    await expect(
      CapabilityOutdoorSource.create(harness.app, 'sensor-1:missing'),
    ).rejects.toThrow('error.notFound')
  })

  it('should reject a device without a capabilities object', async () => {
    const harness = createHarness()
    Object.assign(harness.sensorDevice.device, { capabilitiesObj: null })

    await expect(
      CapabilityOutdoorSource.create(harness.app, OUTDOOR_PATH),
    ).rejects.toThrow('error.notFound')
  })

  it('should start watching with the first subscriber', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )

    await source.attach(createSubscriber())

    expect(source.value).toBe(30)
    expect(source.name).toBe('Outdoor unit')
    expect(harness.pushToUI).toHaveBeenCalledWith('created', {
      capability: names.temperature,
      name: 'Outdoor unit',
    })
  })

  it('should not rearm the capability instance for a second subscriber', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )
    await source.attach(createSubscriber())
    const firstInstance = getOutdoorInstance(harness)

    await source.attach(createSubscriber())

    expect(getOutdoorInstance(harness)).toBe(firstInstance)
  })

  it('should recalculate the subscribers when the reading changes', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )
    const subscriber = createSubscriber()
    await source.attach(subscriber)

    await getOutdoorInstance(harness).listener(38.4)

    expect(source.value).toBe(38.4)
    expect(subscriber.setTargetTemperature).toHaveBeenCalledTimes(1)
  })

  it('should ignore a reading equal to the current value', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )
    const subscriber = createSubscriber()
    await source.attach(subscriber)

    await getOutdoorInstance(harness).listener(30)

    expect(subscriber.setTargetTemperature).toHaveBeenCalledTimes(0)
  })

  it('should read a non-numeric payload as no measurement', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )
    const subscriber = createSubscriber()
    await source.attach(subscriber)

    await getOutdoorInstance(harness).listener('not-a-number')

    expect(source.value).toBeNull()
  })

  it('should read a missing initial value as no measurement', async () => {
    const harness = createHarness()
    harness.sensorDevice.values['measure_temperature.outdoor'] = null
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )

    await source.attach(createSubscriber())

    expect(source.value).toBeNull()
  })

  it('should stop watching when the last subscriber detaches', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )
    const [first, second] = [createSubscriber(), createSubscriber()]
    await source.attach(first)
    await source.attach(second)

    source.detach(first)

    expect(getOutdoorInstance(harness).destroy).toHaveBeenCalledTimes(0)

    source.detach(second)

    expect(getOutdoorInstance(harness).destroy).toHaveBeenCalledTimes(1)
    expect(harness.pushToUI).toHaveBeenCalledWith('cleaned', {
      capability: names.temperature,
      name: 'Outdoor unit',
    })
  })

  it('should stay released when detaching without having watched', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )

    source.detach(createSubscriber())

    expect(
      harness.sensorDevice.capabilityInstances.has(
        'measure_temperature.outdoor',
      ),
    ).toBe(false)
  })

  it('should rearm the watcher when a device cools again after release', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )
    const subscriber = createSubscriber()
    await source.attach(subscriber)
    source.detach(subscriber)
    harness.sensorDevice.values['measure_temperature.outdoor'] = 26

    await source.attach(subscriber)

    expect(source.value).toBe(26)
  })

  it('should clear the subscribers on destroy', async () => {
    const harness = createHarness()
    const source = await CapabilityOutdoorSource.create(
      harness.app,
      OUTDOOR_PATH,
    )
    await source.attach(createSubscriber())

    source.destroy()

    expect(getOutdoorInstance(harness).destroy).toHaveBeenCalledTimes(1)
  })
})
