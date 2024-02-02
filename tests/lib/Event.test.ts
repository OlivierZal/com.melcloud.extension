import { describe, expect, it, jest } from '@jest/globals'
import Event from '../../lib/Event'
import type { EventParams, HomeySettings } from '../../types'

const locales: Partial<Record<string, Record<string, string>>> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  en: {
    'log.testEvent': 'Log - English: {name}, {id}',
    'log.error.testEvent': 'Error - English: {name}, {id}',
  },
  fr: {
    'log.testEvent': 'Log - Français : {name}, {id}',
    'log.error.testEvent': 'Erreur - Français : {name}, {id}',
  },
  /* eslint-enable @typescript-eslint/naming-convention */
}

const homeySettings: HomeySettings = {
  enabled: null,
  capabilityPath: null,
  thresholds: null,
  lastLogs: null,
}

const formatString = (
  template: string | undefined,
  values: Record<string, string>,
): string =>
  (template ?? '').replace(/{(\w+)}/gu, (id: string, key: string) =>
    key in values ? values[key] : id,
  )

const mockGetLanguage: jest.MockedFunction<() => string> = jest.fn(() => 'fr')
const mockHomey = {
  api: { realtime: jest.fn() },
  i18n: { getLanguage: mockGetLanguage },
  settings: {
    get: jest.fn(
      <K extends keyof HomeySettings>(key: K): HomeySettings[K] =>
        homeySettings[key],
    ),
    set: jest.fn(
      <K extends keyof HomeySettings>(
        key: K,
        value: HomeySettings[K],
      ): void => {
        homeySettings[key] = value
      },
    ),
  },
  __: jest.fn((key: string, tags: Record<string, string> = {}): string =>
    formatString(locales[mockGetLanguage()]?.[key], tags),
  ),
}

const eventParams: EventParams = {
  id: 'id',
  name: 'name',
}

describe('', () => {
  const eventName = 'testEvent'
  const eventCategory = eventName
  const eventMessage = 'Log - Français : name, id'

  it('', () => {
    // @ts-expect-error: `homey` is partially typed
    const event: Event = new Event(mockHomey, eventName, eventParams)

    expect(event.name).toBe(eventName)
    expect(event.message).toBe(eventMessage)

    expect(mockHomey.settings.set).toHaveBeenCalledWith(
      'lastLogs',
      expect.any(Array),
    )

    const lastLogs: unknown[] = homeySettings.lastLogs ?? []
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    expect(lastLogs).toHaveLength(1)
    expect(lastLogs[0]).toMatchObject({
      category: eventCategory,
      message: eventMessage,
      time: expect.any(Number),
    })

    expect(mockHomey.api.realtime).toHaveBeenCalledWith(
      'log',
      expect.any(Object),
    )
  })
})

describe('', () => {
  const eventName = 'error.testEvent'
  const eventCategory = 'error'
  const eventMessage = 'Erreur - Français : name, id'

  it('', () => {
    // @ts-expect-error: `homey` is partially typed
    const event: Event = new Event(mockHomey, eventName, eventParams)

    expect(event.name).toBe(eventName)
    expect(event.message).toBe(eventMessage)

    expect(mockHomey.settings.set).toHaveBeenCalledWith(
      'lastLogs',
      expect.any(Array),
    )

    const lastLogs = homeySettings.lastLogs ?? []
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    expect(lastLogs).toHaveLength(2)
    expect(lastLogs[0]).toMatchObject({
      category: eventCategory,
      message: eventMessage,
      time: expect.any(Number),
    })

    expect(mockHomey.api.realtime).toHaveBeenCalledWith(
      'log',
      expect.any(Object),
    )
  })
})
