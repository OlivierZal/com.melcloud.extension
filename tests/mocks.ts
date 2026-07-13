import type { HomeyAPIV3Local } from 'homey-api'
import { vi } from 'vitest'

import type { Homey } from '../lib/homey.mts'
import type { HomeySettings, Names } from '../types.mts'
import { mock } from './helpers.ts'

export const names: Names = {
  device: 'Device',
  homeyWeather: 'the Homey weather',
  outdoorTemperature: 'The outdoor temperature',
  temperature: 'the temperature',
  thermostatMode: 'the mode',
}

export interface MockCapabilityInstance {
  readonly destroy: ReturnType<typeof vi.fn>
  readonly setValue: ReturnType<typeof vi.fn>
  value: boolean | number | string | null
  readonly listener: (value: boolean | number | string) => Promise<void> | void
}

export interface MockDevice {
  readonly capabilityInstances: Map<string, MockCapabilityInstance>
  readonly device: HomeyAPIV3Local.ManagerDevices.Device
  readonly setCapabilityValue: ReturnType<typeof vi.fn>
  readonly values: Record<string, boolean | number | string | null>
}

export const createMockDevice = ({
  capabilities = [],
  capabilitiesOptions = {},
  driverId,
  id,
  name,
  values = {},
}: {
  readonly driverId: string
  readonly id: string
  readonly name: string
  readonly capabilities?: readonly string[]
  readonly capabilitiesOptions?: Readonly<
    Record<string, { max?: number; min?: number }>
  >
  readonly values?: Record<string, boolean | number | string | null>
}): MockDevice => {
  const capabilityInstances = new Map<string, MockCapabilityInstance>()
  const setCapabilityValue = vi
    .fn<(options: { capabilityId: string; value: number }) => Promise<void>>()
    .mockImplementation(async ({ capabilityId, value }) => {
      values[capabilityId] = value
      await Promise.resolve()
    })
  const device = mock<HomeyAPIV3Local.ManagerDevices.Device>({
    capabilities: [...capabilities],
    capabilitiesObj: Object.fromEntries(
      capabilities.map((capabilityId) => [
        capabilityId,
        {
          id: capabilityId,
          title: capabilityId,
          ...capabilitiesOptions[capabilityId],
        },
      ]),
    ),
    driverId,
    id,
    name,
    setCapabilityValue,
    makeCapabilityInstance: (
      capabilityId: string,
      listener: (value: boolean | number | string) => Promise<void> | void,
    ): MockCapabilityInstance => {
      const instance: MockCapabilityInstance = {
        destroy: vi.fn<() => void>(),
        listener,
        setValue: vi
          .fn<(value: boolean | number | string) => Promise<void>>()
          .mockImplementation(async (value) => {
            instance.value = value
            values[capabilityId] = value
            await Promise.resolve()
          }),
        value: values[capabilityId] ?? null,
      }
      capabilityInstances.set(capabilityId, instance)
      return instance
    },
  })
  return { capabilityInstances, device, setCapabilityValue, values }
}

export interface MockDevicesManager {
  readonly connect: ReturnType<typeof vi.fn>
  readonly eventHandlers: Map<string, (...args: unknown[]) => void>
  readonly getCapabilityValue: ReturnType<typeof vi.fn>
  readonly getDevice: ReturnType<typeof vi.fn>
  readonly getDevices: ReturnType<typeof vi.fn>
  readonly manager: HomeyAPIV3Local.ManagerDevices
}

export const createMockDevicesManager = (
  mockDevices: readonly MockDevice[],
): MockDevicesManager => {
  const eventHandlers = new Map<string, (...args: unknown[]) => void>()
  const connect = vi.fn<() => Promise<void>>().mockResolvedValue()
  const getCapabilityValue = vi
    .fn<
      (options: {
        capabilityId: string
        deviceId: string
      }) => boolean | number | string | null
    >()
    .mockImplementation(
      ({ capabilityId, deviceId }) =>
        mockDevices.find(({ device: { id } }) => id === deviceId)?.values[
          capabilityId
        ] ?? null,
    )
  const getDevice = vi
    .fn<(options: { id: string }) => HomeyAPIV3Local.ManagerDevices.Device>()
    .mockImplementation(({ id: deviceId }) => {
      const found = mockDevices.find(({ device: { id } }) => id === deviceId)
      if (found === undefined) {
        throw new Error('device_not_found')
      }
      return found.device
    })
  const getDevices = vi
    .fn<() => Promise<Record<string, HomeyAPIV3Local.ManagerDevices.Device>>>()
    .mockResolvedValue(
      Object.fromEntries(mockDevices.map(({ device }) => [device.id, device])),
    )
  const manager = mock<HomeyAPIV3Local.ManagerDevices>({
    connect,
    getCapabilityValue,
    getDevice,
    getDevices,
    on: (event: string, callback: (...args: unknown[]) => void): void => {
      eventHandlers.set(event, callback)
    },
  })
  return {
    connect,
    eventHandlers,
    getCapabilityValue,
    getDevice,
    getDevices,
    manager,
  }
}

export interface MockHomey {
  readonly apiGet: ReturnType<typeof vi.fn>
  readonly createNotification: ReturnType<typeof vi.fn>
  readonly eventHandlers: Map<string, (...args: unknown[]) => void>
  readonly homey: Homey.Homey
  readonly realtime: ReturnType<typeof vi.fn>
  readonly setSetting: ReturnType<typeof vi.fn>
  readonly settingsStore: Partial<HomeySettings>
  readonly translate: ReturnType<typeof vi.fn>
  readonly unsetSetting: ReturnType<typeof vi.fn>
}

export const createMockHomey = ({
  language = 'en',
  settings = {},
  version = '0.0.0',
}: {
  readonly language?: string
  readonly settings?: Partial<HomeySettings>
  readonly version?: string
} = {}): MockHomey => {
  const settingsStore: Partial<HomeySettings> = { ...settings }
  const eventHandlers = new Map<string, (...args: unknown[]) => void>()
  const createNotification = vi
    .fn<(options: { excerpt: string }) => Promise<void>>()
    .mockResolvedValue()
  const apiGet = vi
    .fn<(uri: string) => unknown>()
    .mockReturnValue({ temperatureCelsius: 30 })
  const realtime = vi.fn<(event: string, data: unknown) => void>()
  const translate = vi
    .fn<(key: string, params?: Record<string, unknown>) => string>()
    .mockImplementation((key) => key)
  const setSetting = vi
    .fn<(key: string, value: unknown) => void>()
    .mockImplementation((key, value) => {
      Object.assign(settingsStore, { [key]: value })
    })
  const unsetSetting = vi
    .fn<(key: keyof HomeySettings) => void>()
    .mockImplementation((key) => {
      Reflect.deleteProperty(settingsStore, key)
    })
  const homey = mock<Homey.Homey>({
    __: translate,
    api: { get: apiGet, realtime },
    i18n: { getLanguage: (): string => language },
    manifest: { version },
    notifications: { createNotification },
    settings: {
      set: setSetting,
      unset: unsetSetting,
      get: (key: keyof HomeySettings): unknown => settingsStore[key] ?? null,
    },
    clearInterval: (interval: NodeJS.Timeout | null): void => {
      if (interval !== null) {
        clearInterval(interval)
      }
    },
    clearTimeout: (timeout: NodeJS.Timeout | null): void => {
      if (timeout !== null) {
        clearTimeout(timeout)
      }
    },
    on: (event: string, callback: (...args: unknown[]) => void): void => {
      eventHandlers.set(event, callback)
    },
    setInterval: (callback: () => void, milliseconds: number): NodeJS.Timeout =>
      setInterval(callback, milliseconds),
    setTimeout: (callback: () => void, milliseconds: number): NodeJS.Timeout =>
      setTimeout(callback, milliseconds),
  })
  return {
    apiGet,
    createNotification,
    eventHandlers,
    homey,
    realtime,
    setSetting,
    settingsStore,
    translate,
    unsetSetting,
  }
}
