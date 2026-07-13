import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type MELCloudExtensionApp from '../../app.mts'
import type { MELCloudListener } from '../../listeners/melcloud.mts'
import { WeatherOutdoorSource } from '../../listeners/weather-source.mts'
import { mock } from '../helpers.ts'
import { type MockHomey, createMockHomey, names } from '../mocks.ts'

const POLL_INTERVAL = 900_000

interface Harness {
  readonly app: MELCloudExtensionApp
  readonly error: ReturnType<typeof vi.fn>
  readonly mockHomey: MockHomey
  readonly pushToUI: ReturnType<typeof vi.fn>
  readonly source: WeatherOutdoorSource
}

const createHarness = (): Harness => {
  const mockHomey = createMockHomey()
  const error = vi.fn<(...args: unknown[]) => void>()
  const pushToUI = vi.fn<(name: string, params?: unknown) => void>()
  const app = mock<MELCloudExtensionApp>({
    error,
    homey: mockHomey.homey,
    names,
    pushToUI,
  })
  return {
    app,
    error,
    mockHomey,
    pushToUI,
    source: new WeatherOutdoorSource(app),
  }
}

const createSubscriber = (): MELCloudListener =>
  mock<MELCloudListener>({
    setTargetTemperature: vi.fn<() => Promise<void>>().mockResolvedValue(),
  })

describe(WeatherOutdoorSource, () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should read the Homey weather with the first subscriber', async () => {
    const harness = createHarness()

    await harness.source.attach(createSubscriber())

    expect(harness.mockHomey.apiGet).toHaveBeenCalledWith(
      '/manager/weather/weather',
    )
    expect(harness.source.value).toBe(30)
    expect(harness.source.name).toBe(names.homeyWeather)
    expect(harness.pushToUI).toHaveBeenCalledWith('created', {
      capability: names.temperature,
      name: names.homeyWeather,
    })
  })

  it('should poll and recalculate the subscribers on change', async () => {
    const harness = createHarness()
    const subscriber = createSubscriber()
    await harness.source.attach(subscriber)
    harness.mockHomey.apiGet.mockReturnValue({ temperatureCelsius: 35.5 })

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL)

    expect(harness.source.value).toBe(35.5)
    expect(subscriber.setTargetTemperature).toHaveBeenCalledTimes(1)
  })

  it('should not broadcast an unchanged reading', async () => {
    const harness = createHarness()
    const subscriber = createSubscriber()
    await harness.source.attach(subscriber)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL)

    expect(subscriber.setTargetTemperature).toHaveBeenCalledTimes(0)
  })

  it('should not rearm the poll for a second subscriber', async () => {
    const harness = createHarness()
    await harness.source.attach(createSubscriber())

    await harness.source.attach(createSubscriber())

    expect(harness.mockHomey.apiGet).toHaveBeenCalledTimes(1)
  })

  it('should read a malformed report as no measurement', async () => {
    const harness = createHarness()
    harness.mockHomey.apiGet.mockReturnValue({ state: 'Cloudy' })

    await harness.source.attach(createSubscriber())

    expect(harness.source.value).toBeNull()
  })

  it('should read a non-object report as no measurement', async () => {
    const harness = createHarness()
    harness.mockHomey.apiGet.mockReturnValue('storm')

    await harness.source.attach(createSubscriber())

    expect(harness.source.value).toBeNull()
  })

  it('should log a failed fetch and read it as no measurement', async () => {
    const harness = createHarness()
    harness.mockHomey.apiGet.mockRejectedValueOnce(new Error('offline'))

    await harness.source.attach(createSubscriber())

    expect(harness.error).toHaveBeenCalledWith('offline')
    expect(harness.source.value).toBeNull()
  })

  it('should stop polling when the last subscriber detaches', async () => {
    const harness = createHarness()
    const subscriber = createSubscriber()
    await harness.source.attach(subscriber)
    harness.mockHomey.apiGet.mockClear()

    harness.source.detach(subscriber)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL)

    expect(harness.mockHomey.apiGet).toHaveBeenCalledTimes(0)
    expect(harness.pushToUI).toHaveBeenCalledWith('cleaned', {
      capability: names.temperature,
      name: names.homeyWeather,
    })
  })

  it('should stay stopped when detaching without having watched', () => {
    const harness = createHarness()

    harness.source.detach(createSubscriber())

    expect(harness.pushToUI).toHaveBeenCalledTimes(0)
  })

  it('should stop polling on destroy', async () => {
    const harness = createHarness()
    await harness.source.attach(createSubscriber())
    harness.mockHomey.apiGet.mockClear()

    harness.source.destroy()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL)

    expect(harness.mockHomey.apiGet).toHaveBeenCalledTimes(0)
  })
})
