import type { Homey } from 'homey/lib/Homey'
import { describe, expect, it, vi } from 'vitest'

import type MELCloudExtensionApp from '../../app.mts'
import type { TemperatureListenerData } from '../../types.mts'
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
  name: 'Living room',
})

const homeDevice = createMockDevice({
  capabilities: ['measure_temperature', 'target_temperature'],
  driverId: 'homey:app:com.mecloud:home-melcloud',
  id: 'home-1',
  name: 'Bedroom',
})

const sensorDevice = createMockDevice({
  capabilities: ['measure_temperature', 'measure_temperature.floor'],
  driverId: 'homey:app:com.other:sensor',
  id: 'sensor-1',
  name: 'Aquarium',
})

const createHomeyContext = ({
  melcloudDevices,
  temperatureSensors,
}: {
  readonly melcloudDevices: MELCloudExtensionApp['melcloudDevices']
  readonly temperatureSensors: MELCloudExtensionApp['temperatureSensors']
}): { autoAdjustCooling: ReturnType<typeof vi.fn>; homey: Homey } => {
  const autoAdjustCooling = vi
    .fn<(data?: TemperatureListenerData) => Promise<void>>()
    .mockResolvedValue()
  const homey = mock<Homey>({
    app: mock<MELCloudExtensionApp>({
      autoAdjustCooling,
      melcloudDevices,
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
      const body = { capabilityPath: 'classic-1:xx', isEnabled: true }

      await api.autoAdjustCooling({ body, homey })

      expect(autoAdjustCooling).toHaveBeenCalledWith(body)
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
