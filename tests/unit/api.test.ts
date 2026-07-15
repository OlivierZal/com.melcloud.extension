import type { Homey } from 'homey/lib/Homey'
import { describe, expect, it, vi } from 'vitest'

import type MELCloudExtensionApp from '../../app.mts'
import type { HomeySettings, TemperatureListenerData } from '../../types.mts'
import { mock } from '../helpers.ts'
import { createMockDevice } from '../mocks.ts'
import api from '../../api.mts'

const classicDevice = createMockDevice({
  capabilities: [
    'measure_temperature',
    'measure_temperature.outdoor',
    'target_temperature',
    'thermostat_mode',
  ],
  driverId: 'homey:app:com.mecloud:melcloud',
  id: 'classic-1',
  melcloudId: '1',
  name: 'Living room',
})

const homeDevice = createMockDevice({
  capabilities: ['measure_temperature', 'target_temperature'],
  driverId: 'homey:app:com.mecloud:home-melcloud',
  id: 'home-1',
  melcloudId: 'home-melcloud-1',
  name: 'Bedroom',
})

const sensorDevice = createMockDevice({
  capabilities: ['measure_temperature', 'measure_temperature.floor'],
  driverId: 'homey:app:com.other:sensor',
  id: 'sensor-1',
  name: 'Aquarium',
})

const createHomeyContext = ({
  deviceGroups = null,
  melcloudDevices,
  settings = {},
  temperatureSensors,
}: {
  readonly melcloudDevices: MELCloudExtensionApp['melcloudDevices']
  readonly temperatureSensors: MELCloudExtensionApp['temperatureSensors']
  readonly deviceGroups?: MELCloudExtensionApp['deviceGroups']
  readonly settings?: Partial<HomeySettings>
}): { autoAdjustCooling: ReturnType<typeof vi.fn>; homey: Homey } => {
  const autoAdjustCooling = vi
    .fn<(data?: TemperatureListenerData) => Promise<void>>()
    .mockResolvedValue()
  const homey = mock<Homey>({
    app: mock<MELCloudExtensionApp>({
      autoAdjustCooling,
      deviceGroups,
      homey: {
        settings: {
          get: (key: keyof HomeySettings): unknown => settings[key] ?? null,
        },
      },
      log: vi.fn<(...args: readonly unknown[]) => void>(),
      melcloudDevices,
      refreshDeviceGroups: vi
        .fn<MELCloudExtensionApp['refreshDeviceGroups']>()
        .mockResolvedValue(deviceGroups),
      temperatureSensors,
    }),
    i18n: { getLanguage: (): string => 'fr' },
  })
  return { autoAdjustCooling, homey }
}

describe('api', () => {
  describe('getLanguage', () => {
    it('should return the Homey language', () => {
      const { homey } = createHomeyContext({
        melcloudDevices: [],
        temperatureSensors: [],
      })

      expect(api.getLanguage({ homey })).toBe('fr')
    })
  })

  describe('autoAdjustCooling', () => {
    it('should forward the body to the app', async () => {
      const { autoAdjustCooling, homey } = createHomeyContext({
        melcloudDevices: [],
        temperatureSensors: [],
      })
      const body = {
        isEnabled: true,
        outdoorSources: {
          'classic-1': 'classic-1:measure_temperature.outdoor',
        },
      }

      await api.autoAdjustCooling({ body, homey })

      expect(autoAdjustCooling).toHaveBeenCalledWith(body)
    })
  })

  describe('getAdjustableGroups', () => {
    it('should throw when no MELCloud AC device is paired', async () => {
      const { homey } = createHomeyContext({
        melcloudDevices: [],
        temperatureSensors: [],
      })

      await expect(api.getAdjustableGroups({ homey })).rejects.toThrow(
        'notFound',
      )
    })

    it('should fall back to a single flat group without grouping', async () => {
      const { homey } = createHomeyContext({
        melcloudDevices: [classicDevice.device, homeDevice.device],
        settings: {
          outdoorSources: { 'home-1': 'none' },
        },
        temperatureSensors: [],
      })

      await expect(api.getAdjustableGroups({ homey })).resolves.toStrictEqual([
        {
          devices: [
            { id: 'home-1', name: 'Bedroom', outdoorSource: 'none' },
            { id: 'classic-1', name: 'Living room', outdoorSource: null },
          ],
          name: null,
        },
      ])
    })

    it('should group by building, merging same-name buildings across dialects', async () => {
      const { homey } = createHomeyContext({
        deviceGroups: [
          { deviceIds: ['1'], name: 'Domicile' },
          { deviceIds: ['home-melcloud-1'], name: 'Domicile' },
        ],
        melcloudDevices: [classicDevice.device, homeDevice.device],
        temperatureSensors: [],
      })

      await expect(api.getAdjustableGroups({ homey })).resolves.toStrictEqual([
        {
          devices: [
            { id: 'home-1', name: 'Bedroom', outdoorSource: null },
            { id: 'classic-1', name: 'Living room', outdoorSource: null },
          ],
          name: 'Domicile',
        },
      ])
    })

    it('should leave a device without a usable join id unmatched', async () => {
      const bareDevice = createMockDevice({
        driverId: 'homey:app:com.mecloud:melcloud',
        id: 'bare-1',
        name: 'Bare',
      })
      Object.assign(bareDevice.device, { data: {} })
      const { homey } = createHomeyContext({
        deviceGroups: [{ deviceIds: ['bare-1'], name: 'Domicile' }],
        melcloudDevices: [bareDevice.device],
        temperatureSensors: [],
      })

      await expect(api.getAdjustableGroups({ homey })).resolves.toStrictEqual([
        {
          devices: [{ id: 'bare-1', name: 'Bare', outdoorSource: null }],
          name: null,
        },
      ])
    })

    it('should sort named groups alphabetically', async () => {
      const { homey } = createHomeyContext({
        deviceGroups: [
          { deviceIds: ['1'], name: 'Maison B' },
          { deviceIds: ['home-melcloud-1'], name: 'Maison A' },
        ],
        melcloudDevices: [classicDevice.device, homeDevice.device],
        temperatureSensors: [],
      })

      const groups = await api.getAdjustableGroups({ homey })

      expect(groups.map(({ name }) => name)).toStrictEqual([
        'Maison A',
        'Maison B',
      ])
    })

    it('should trail the unnamed group behind a later-inserted named one', async () => {
      const { homey } = createHomeyContext({
        deviceGroups: [{ deviceIds: ['1'], name: 'Domicile' }],
        melcloudDevices: [classicDevice.device, homeDevice.device],
        temperatureSensors: [],
      })

      const groups = await api.getAdjustableGroups({ homey })

      expect(groups.map(({ name }) => name)).toStrictEqual(['Domicile', null])
    })

    it('should trail unmatched devices in an unnamed group', async () => {
      const { homey } = createHomeyContext({
        deviceGroups: [{ deviceIds: ['1'], name: 'Domicile' }],
        // Unmatched device first: the unnamed group must still trail
        melcloudDevices: [homeDevice.device, classicDevice.device],
        temperatureSensors: [],
      })

      await expect(api.getAdjustableGroups({ homey })).resolves.toStrictEqual([
        {
          devices: [
            { id: 'classic-1', name: 'Living room', outdoorSource: null },
          ],
          name: 'Domicile',
        },
        {
          devices: [{ id: 'home-1', name: 'Bedroom', outdoorSource: null }],
          name: null,
        },
      ])
    })
  })

  describe('getTemperatureSensors', () => {
    it('should throw when no MELCloud AC device is paired', () => {
      const { homey } = createHomeyContext({
        melcloudDevices: [],
        temperatureSensors: [sensorDevice.device],
      })

      expect(() => api.getTemperatureSensors({ homey })).toThrow('notFound')
    })

    it('should only expose the outdoor temperature of MELCloud AC devices', () => {
      const { homey } = createHomeyContext({
        melcloudDevices: [classicDevice.device, homeDevice.device],
        temperatureSensors: [classicDevice.device, homeDevice.device],
      })

      expect(api.getTemperatureSensors({ homey })).toStrictEqual([
        {
          capabilityName: 'Living room - measure_temperature.outdoor',
          capabilityPath: 'classic-1:measure_temperature.outdoor',
        },
      ])
    })

    it('should expose every temperature of non-MELCloud devices, sorted by name', () => {
      const { homey } = createHomeyContext({
        melcloudDevices: [classicDevice.device],
        temperatureSensors: [sensorDevice.device, classicDevice.device],
      })

      expect(api.getTemperatureSensors({ homey })).toStrictEqual([
        {
          capabilityName: 'Aquarium - measure_temperature',
          capabilityPath: 'sensor-1:measure_temperature',
        },
        {
          capabilityName: 'Aquarium - measure_temperature.floor',
          capabilityPath: 'sensor-1:measure_temperature.floor',
        },
        {
          capabilityName: 'Living room - measure_temperature.outdoor',
          capabilityPath: 'classic-1:measure_temperature.outdoor',
        },
      ])
    })

    it('should skip devices without a capabilities object', () => {
      const bareDevice = createMockDevice({
        driverId: 'homey:app:com.other:sensor',
        id: 'bare-1',
        name: 'Bare',
      })
      Object.assign(bareDevice.device, { capabilitiesObj: null })
      const { homey } = createHomeyContext({
        melcloudDevices: [classicDevice.device],
        temperatureSensors: [bareDevice.device],
      })

      expect(api.getTemperatureSensors({ homey })).toStrictEqual([])
    })
  })
})
