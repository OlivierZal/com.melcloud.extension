// @vitest-environment happy-dom
// @vitest-environment-options {"settings": {"disableCSSFileLoading": true, "disableJavaScriptFileLoading": true, "navigation": {"disableMainFrameNavigation": true}}}

import { readFileSync } from 'node:fs'

import type HomeySettings from 'homey/lib/HomeySettings'
import {
  getButton,
  getDetails,
  getDiv,
  getFieldset,
  getSelect,
} from '@olivierzal/homey-kit/dom'
import { Temporal } from 'temporal-polyfill'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AdjustableGroup,
  TemperatureSensor,
  TimestampedLog,
} from '../../types.mts'
import { mock, settleDetached } from '../helpers.ts'

// A plain relative path: under the happy-dom environment
// `import.meta.url` is an http URL the fs module refuses.
const pageHtml = readFileSync('settings/index.html', 'utf8')

// Fixed mid-day clock (only `Date` is faked — `setImmediate` stays real
// for settleDetached): every relative-time offset below stays inside
// the intended day in UTC and Europe/Paris alike.
const NOW_MS = Temporal.Instant.from('2026-08-10T12:00:00Z').epochMilliseconds
const MINUTES_30_MS = 1_800_000
const HOURS_2_MS = 7_200_000
const HOURS_26_MS = 93_600_000
const DAYS_8_MS = 691_200_000

type ApiCallback = (error: Error | null, result: unknown) => void

interface Harness {
  readonly alert: ReturnType<typeof vi.fn>
  readonly api: ReturnType<typeof vi.fn>
  readonly homey: HomeySettings
  readonly openURL: ReturnType<typeof vi.fn>
  readonly ready: ReturnType<typeof vi.fn>
  readonly routes: Record<string, unknown>
  readonly emit: (event: string, ...eventArgs: unknown[]) => void
}

interface HomeyOptions {
  readonly failures?: Readonly<Record<string, Error>>
  readonly routes?: Record<string, unknown>
  readonly shouldRejectAlerts?: boolean
  readonly storedError?: Error | null
  readonly storedSettings?: Record<string, unknown> | null
  readonly translations?: Readonly<Record<string, string>>
}

const groupsFixture = (): AdjustableGroup[] => [
  {
    devices: [
      { id: 'd1', name: 'Salon', outdoorSource: 'w1:measure_temperature' },
      { id: 'd2', name: 'Cuisine', outdoorSource: 'w1:measure_temperature' },
    ],
    name: 'Maison',
  },
  { devices: [{ id: 'd3', name: 'Bureau', outdoorSource: null }], name: null },
]

// Same building, two different feeds — plus a device-less group whose
// common value can only be the mixed sentinel.
const divergedGroupsFixture = (): AdjustableGroup[] => [
  {
    devices: [
      { id: 'd1', name: 'Salon', outdoorSource: 'w1:measure_temperature' },
      { id: 'd2', name: 'Cuisine', outdoorSource: 'w2:measure_temperature' },
    ],
    name: 'Maison',
  },
  { devices: [], name: 'Annexe' },
]

const sensorsFixture = (): TemperatureSensor[] => [
  { capabilityName: 'Station météo', capabilityPath: 'w1:measure_temperature' },
  {
    capabilityName: 'Capteur jardin',
    capabilityPath: 'w2:measure_temperature',
  },
]

const defaultTranslations: Readonly<Record<string, string>> = {
  'settings.defaultSource': 'Homey weather',
  'settings.disabledSource': 'Do not adjust',
  'settings.searchSource': 'Search…',
}

// The SDK api overloads GET/DELETE (3 args) with POST/PUT (4): the mock
// mirrors that shape through a rest tuple and picks the trailing
// callback, whichever slot it landed in.
type ApiCallArgs = readonly [string, string, ...unknown[]]

const createApiMock = (
  failures: Readonly<Record<string, Error>>,
  routes: Record<string, unknown>,
): ReturnType<typeof vi.fn> =>
  vi.fn<(...callArgs: ApiCallArgs) => void>((...callArgs) => {
    const [method, path] = callArgs
    const callback = callArgs.findLast(
      (argument): argument is ApiCallback => typeof argument === 'function',
    )
    const key = `${method} ${path}`
    const failure = failures[key]
    if (failure === undefined) {
      callback?.(null, routes[key])
      return
    }
    callback?.(failure, null)
  })

const createAlertMock = (
  shouldRejectAlerts: boolean,
): ReturnType<typeof vi.fn<() => Promise<void>>> =>
  shouldRejectAlerts
    ? vi
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error('alert channel down'))
    : vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

const createHarness = (options: HomeyOptions = {}): Harness => {
  const {
    failures = {},
    routes = {},
    shouldRejectAlerts = false,
    storedError = null,
    storedSettings = {},
    translations = {},
  } = options
  const listeners = new Map<string, ((...eventArgs: unknown[]) => void)[]>()
  const api = createApiMock(failures, routes)
  const alert = createAlertMock(shouldRejectAlerts)
  const openURL = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const ready = vi.fn<() => void>()
  const homey = mock<HomeySettings>({
    alert,
    api,
    openURL,
    ready,
    __: (key: string): string =>
      ({ ...defaultTranslations, ...translations })[key] ?? key,
    get: (callback: (error: Error | null, settings: unknown) => void): void => {
      callback(storedError, storedSettings)
    },
    on: (event: string, listener: (...eventArgs: unknown[]) => void): void => {
      const bucket = listeners.get(event) ?? []
      bucket.push(listener)
      listeners.set(event, bucket)
    },
  })
  return {
    alert,
    api,
    homey,
    openURL,
    ready,
    routes,
    emit: (event: string, ...eventArgs: unknown[]): void => {
      const bucket = listeners.get(event)
      if (bucket === undefined) {
        return
      }
      for (const listener of bucket) {
        listener(...eventArgs)
      }
    },
  }
}

const defaultRoutes = (): Record<string, unknown> => ({
  'GET /devices/groups': groupsFixture(),
  'GET /devices/sensors/temperature': sensorsFixture(),
  'GET /language': 'fr',
  'GET /webview-hashes': {},
  'POST /boot-error': undefined,
  'PUT /cooling/auto-adjustment': undefined,
})

const defaultSettings = (): Record<string, unknown> => ({
  isEnabled: true,
  lastLogs: [],
})

// The page captures its elements at module load, so every boot needs a
// fresh evaluation against the freshly loaded document.
const bootPage = async (options: HomeyOptions = {}): Promise<Harness> => {
  const harness = createHarness({
    routes: defaultRoutes(),
    storedSettings: defaultSettings(),
    ...options,
  })
  const { start } = await import('../../settings/index.mts')
  await start(harness.homey)
  await settleDetached()
  return harness
}

const sourceInput = (id: string): HTMLInputElement => {
  const element = document.querySelector(`#${CSS.escape(`source-${id}`)}`)
  if (element instanceof HTMLInputElement) {
    return element
  }
  throw new TypeError(`No combobox input for \`${id}\``)
}

const optionItems = (input: HTMLInputElement): HTMLLIElement[] => [
  ...(input.parentElement?.querySelectorAll('li') ?? []),
]

const pickOption = (input: HTMLInputElement, name: string): void => {
  const item = optionItems(input).find(
    ({ textContent }) => textContent === name,
  )
  if (item === undefined) {
    throw new TypeError(`No option named \`${name}\``)
  }
  item.click()
}

const commitEnabled = (value: string): void => {
  const element = getSelect('enabled')
  element.value = value
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

const logRows = (): HTMLDivElement[] => [
  ...getDiv('logs').querySelectorAll<HTMLDivElement>('.log-row'),
]

const logDays = (): HTMLDivElement[] => [
  ...getDiv('logs').querySelectorAll<HTMLDivElement>('.log-day'),
]

// DOMParser never executes scripts, which is exactly why it is the
// sanctioned way to load the real page into the simulated DOM; appended
// nodes are auto-adopted across documents.
const loadPage = (): void => {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(pageHtml, 'text/html')
  // Stylesheets are inert under happy-dom, but adopting the <link>
  // still fires its loader against the test origin — drop it.
  for (const link of parsed.head.querySelectorAll('link')) {
    link.remove()
  }
  document.head.replaceChildren(...parsed.head.children)
  document.body.replaceChildren(...parsed.body.children)
}

describe('settings page', () => {
  let reportErrorMock = vi.fn<(error: unknown) => void>()

  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers({ now: NOW_MS, toFake: ['Date'] })
    reportErrorMock = vi.fn<(error: unknown) => void>()
    vi.stubGlobal('reportError', reportErrorMock)
    sessionStorage.clear()
    loadPage()
    document.documentElement.lang = 'en'
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('boot', () => {
    it('should build the source rows and seed their selections', async () => {
      const { ready } = await bootPage()

      expect(ready).toHaveBeenCalledTimes(1)
      expect(document.documentElement.lang).toBe('fr')
      expect(sourceInput('group-0').value).toBe('Station météo')
      expect(sourceInput('group-0').placeholder).toBe('Search…')
      expect(sourceInput('group-0').ariaLabel).toBe('Maison — Search…')
      expect(sourceInput('d3').value).toBe('Homey weather')
      expect(getSelect('enabled').value).toBe('true')
      expect(getDetails('configuration').open).toBe(false)
      expect(getButton('apply').disabled).toBe(true)
      expect(getDiv('empty_state').hidden).toBe(true)
    })

    it('should open the configuration when adjustment is disabled', async () => {
      await bootPage({ storedSettings: { isEnabled: false } })

      expect(getSelect('enabled').value).toBe('false')
      expect(getDetails('configuration').open).toBe(true)
    })

    it('should not yank the panel shut when Refresh re-reads', async () => {
      await bootPage({ storedSettings: { isEnabled: false } })

      getDetails('configuration').open = false
      getButton('refresh').click()
      await settleDetached()

      expect(getDetails('configuration').open).toBe(false)
    })

    it('should show a diverged or empty group as a blank field', async () => {
      await bootPage({
        routes: {
          ...defaultRoutes(),
          'GET /devices/groups': divergedGroupsFixture(),
        },
      })

      expect(sourceInput('group-0').value).toBe('')
      expect(sourceInput('group-1').value).toBe('')
    })

    it('should keep the authored language when the read fails', async () => {
      await bootPage({ failures: { 'GET /language': new Error('offline') } })

      expect(document.documentElement.lang).toBe('en')
      expect(sourceInput('d3').value).toBe('Homey weather')
    })

    it('should point an empty install to the store page', async () => {
      const { openURL } = await bootPage({
        routes: { ...defaultRoutes(), 'GET /devices/groups': [] },
      })

      expect(getDiv('empty_state').hidden).toBe(false)

      getButton('install').click()

      expect(openURL).toHaveBeenCalledWith('https://homey.app/a/com.mecloud')
    })

    it.each([
      ['serialized NotFoundError', new Error('notFound')],
      ['bridge wording', new Error('Not found: GET /api/app/com.mecloud')],
    ])('should read a %s as no devices, silently', async (_name, error) => {
      const { alert } = await bootPage({
        failures: {
          'GET /devices/groups': error,
          'GET /devices/sensors/temperature': error,
        },
      })

      expect(alert).not.toHaveBeenCalled()
      expect(getDiv('empty_state').hidden).toBe(false)
    })

    it('should alert any other list failure and degrade to empty', async () => {
      const { alert } = await bootPage({
        failures: { 'GET /devices/groups': new Error('boom') },
      })

      expect(alert).toHaveBeenCalledWith('boom')
      expect(getDiv('empty_state').hidden).toBe(false)
    })

    it('should alert when the settings store read fails', async () => {
      const { alert } = await bootPage({
        storedError: new Error('storage down'),
      })

      expect(alert).toHaveBeenCalledWith('storage down')
    })

    it('should release the controls and surface a failed init', async () => {
      const { alert, ready } = await bootPage({
        shouldRejectAlerts: true,
        storedError: new Error('storage down'),
      })

      expect(ready).toHaveBeenCalledTimes(1)
      expect(alert).toHaveBeenCalledWith('storage down')
      expect(getButton('refresh').disabled).toBe(false)
      expect(reportErrorMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('log pane', () => {
    it('should rebuild the retained logs newest first with day separators', async () => {
      await bootPage({
        storedSettings: {
          isEnabled: true,
          // Newest first, the order the app persists them in
          lastLogs: [
            {
              category: 'calculated',
              message: 'Target reached',
              time: NOW_MS - MINUTES_30_MS,
            },
            {
              category: 'saved',
              message: 'Old push',
              time: NOW_MS - HOURS_26_MS,
            },
            { message: 'Too old', time: NOW_MS - DAYS_8_MS },
          ] satisfies TimestampedLog[],
        },
      })

      const rows = logRows()

      expect(rows).toHaveLength(2)
      expect(logDays()).toHaveLength(2)
      expect(rows[0]?.textContent).toContain('Target reached')
      expect(rows[0]?.textContent).toContain('il y a 30 minutes')
      expect(rows[0]?.textContent).toContain('🎯')
      expect(rows[0]?.querySelector('.log-message-calculated')).not.toBeNull()
      expect(
        rows[0]?.querySelector<HTMLDivElement>('.log-time')?.title,
      ).not.toBe('')
      expect(rows[1]?.textContent).toContain('Old push')
      expect(rows[1]?.textContent).toContain('☁️')
      expect(rows[1]?.textContent).not.toContain('il y a')
    })

    it('should keep the pane empty without retained logs', async () => {
      await bootPage({ storedSettings: { isEnabled: true, lastLogs: null } })

      expect(logRows()).toHaveLength(0)
    })

    it.each([
      ['an unknown category', 'mystery'],
      ['no category', undefined],
    ])('should style %s as an error', async (_name, category) => {
      const { emit } = await bootPage()

      emit('log', {
        category,
        message: 'Went wrong',
        time: NOW_MS - HOURS_2_MS,
      })

      const [row] = logRows()

      expect(row?.textContent).toContain('⚠️')
      expect(row?.textContent).toContain('il y a 2 heures')
      expect(row?.querySelector('.log-message-error')).not.toBeNull()
    })

    it('should insert a same-day live log right below the separator', async () => {
      const { emit } = await bootPage({
        storedSettings: {
          isEnabled: true,
          lastLogs: [
            {
              category: 'listened',
              message: 'First',
              time: NOW_MS - HOURS_2_MS,
            },
          ] satisfies TimestampedLog[],
        },
      })

      emit('log', {
        category: 'created',
        message: 'Second',
        time: NOW_MS - MINUTES_30_MS,
      })

      expect(logRows().map(({ textContent }) => textContent)).toStrictEqual([
        expect.stringContaining('Second'),
        expect.stringContaining('First'),
      ])
      expect(logDays()).toHaveLength(1)
    })

    it('should open a new day block for an out-of-day live log', async () => {
      const { emit } = await bootPage()

      emit('log', { category: 'saved', message: 'Now', time: NOW_MS })
      emit('log', {
        category: 'reverted',
        message: 'Belated',
        time: NOW_MS - HOURS_26_MS,
      })

      expect(logDays()).toHaveLength(2)
      expect(logRows()[0]?.textContent).toContain('Belated')
    })

    it('should keep the live rows across a Refresh', async () => {
      const { emit } = await bootPage()

      emit('log', { category: 'cleaned', message: 'Kept', time: NOW_MS })
      getButton('refresh').click()
      await settleDetached()

      expect(logRows()).toHaveLength(1)
      expect(logRows()[0]?.textContent).toContain('Kept')
    })
  })

  describe('source combobox', () => {
    it('should drop the full list on click with the selection marked', async () => {
      await bootPage()

      const input = sourceInput('group-0')
      input.click()
      const items = optionItems(input)

      expect(input.getAttribute('aria-expanded')).toBe('true')
      expect(items.map(({ textContent }) => textContent)).toStrictEqual([
        'Do not adjust',
        'Homey weather',
        'Station météo',
        'Capteur jardin',
      ])
      expect(
        items
          .find(({ textContent }) => textContent === 'Station météo')
          ?.getAttribute('aria-selected'),
      ).toBe('true')
      expect(
        items
          .find(({ textContent }) => textContent === 'Homey weather')
          ?.getAttribute('aria-selected'),
      ).toBe('false')
    })

    it('should switch to typing mode on the second tap only', async () => {
      await bootPage()

      const input = sourceInput('group-0')
      input.click()

      expect(input.inputMode).toBe('none')

      input.click()

      expect(input.inputMode).toBe('text')

      input.click()

      expect(input.inputMode).toBe('text')
      expect(input.getAttribute('aria-expanded')).toBe('true')
    })

    it('should filter the options while typing', async () => {
      await bootPage()

      const input = sourceInput('group-0')
      input.click()
      input.value = 'jardin'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      expect(
        optionItems(input).map(({ textContent }) => textContent),
      ).toStrictEqual(['Capteur jardin'])
    })

    it('should reopen a closed list when typing resumes', async () => {
      await bootPage()

      const input = sourceInput('group-0')
      input.click()
      document.body.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true }),
      )

      expect(input.getAttribute('aria-expanded')).toBe('false')

      input.value = 'station'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      expect(input.getAttribute('aria-expanded')).toBe('true')
      expect(
        optionItems(input).map(({ textContent }) => textContent),
      ).toStrictEqual(['Station météo'])
    })

    it('should write a group pick to every device and arm Apply', async () => {
      const { api } = await bootPage()

      const input = sourceInput('group-0')
      input.click()
      pickOption(input, 'Capteur jardin')

      expect(input.value).toBe('Capteur jardin')
      expect(input.getAttribute('aria-expanded')).toBe('false')
      expect(getButton('apply').disabled).toBe(false)

      getButton('apply').click()
      await settleDetached()

      expect(api).toHaveBeenCalledWith(
        'PUT',
        '/cooling/auto-adjustment',
        {
          isEnabled: true,
          outdoorSources: {
            d1: 'w2:measure_temperature',
            d2: 'w2:measure_temperature',
            d3: null,
          },
        },
        expect.any(Function),
      )
      expect(getButton('apply').disabled).toBe(true)
    })

    it('should auto-enable the adjustment when a source is picked', async () => {
      await bootPage({ storedSettings: { isEnabled: false } })

      const input = sourceInput('d3')
      input.click()
      pickOption(input, 'Do not adjust')

      expect(getSelect('enabled').value).toBe('true')
      expect(getButton('apply').disabled).toBe(false)
    })

    it('should ignore the click a scroll gesture lands on', async () => {
      await bootPage()

      const input = sourceInput('group-0')
      input.click()
      const list = input.parentElement?.querySelector('ul')
      list?.dispatchEvent(
        new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }),
      )
      const item = optionItems(input).find(
        ({ textContent }) => textContent === 'Capteur jardin',
      )
      item?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 40 }),
      )

      expect(input.getAttribute('aria-expanded')).toBe('true')

      item?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 4 }),
      )

      expect(input.getAttribute('aria-expanded')).toBe('false')
      expect(input.value).toBe('Capteur jardin')
    })

    it('should let only one list stay open', async () => {
      await bootPage()

      const groupInput = sourceInput('group-0')
      const deviceInput = sourceInput('d3')
      groupInput.click()
      deviceInput.click()

      expect(groupInput.getAttribute('aria-expanded')).toBe('false')
      expect(deviceInput.getAttribute('aria-expanded')).toBe('true')
    })

    it('should close on an outside press and stay open on an inside one', async () => {
      await bootPage()

      const input = sourceInput('group-0')
      input.click()
      input.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))

      expect(input.getAttribute('aria-expanded')).toBe('true')

      document.dispatchEvent(new Event('pointerdown'))

      expect(input.getAttribute('aria-expanded')).toBe('false')
    })

    it('should show a diverged group as blank and restore it on close', async () => {
      await bootPage({
        routes: {
          ...defaultRoutes(),
          'GET /devices/groups': divergedGroupsFixture(),
        },
      })

      const input = sourceInput('group-0')
      input.click()

      expect(
        optionItems(input).every(
          (item) => item.getAttribute('aria-selected') === 'false',
        ),
      ).toBe(true)

      document.body.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true }),
      )

      expect(input.value).toBe('')
    })
  })

  describe('adjustment form', () => {
    it('should arm Apply on an enable flip and disarm on revert', async () => {
      await bootPage()

      commitEnabled('false')

      expect(getButton('apply').disabled).toBe(false)

      commitEnabled('true')

      expect(getButton('apply').disabled).toBe(true)
    })

    it('should push the disabled state without re-enabling it', async () => {
      const { api } = await bootPage()

      commitEnabled('false')
      getButton('apply').click()
      await settleDetached()

      expect(api).toHaveBeenCalledWith(
        'PUT',
        '/cooling/auto-adjustment',
        expect.objectContaining({ isEnabled: false }),
        expect.any(Function),
      )
      expect(getSelect('enabled').value).toBe('false')
      expect(getButton('apply').disabled).toBe(true)
    })

    it('should alert a failed push and keep the form armed', async () => {
      const { alert } = await bootPage({
        failures: { 'PUT /cooling/auto-adjustment': new Error('offline') },
      })

      commitEnabled('false')
      getButton('apply').click()
      await settleDetached()

      expect(alert).toHaveBeenCalledWith('offline')
      expect(getButton('apply').disabled).toBe(false)
      expect(getButton('refresh').disabled).toBe(false)
      expect(getFieldset('adjustment').disabled).toBe(false)
    })

    it('should restore the saved values on Refresh', async () => {
      await bootPage()

      commitEnabled('false')
      const input = sourceInput('group-0')
      input.click()
      pickOption(input, 'Do not adjust')
      getButton('refresh').click()
      await settleDetached()

      expect(getSelect('enabled').value).toBe('true')
      expect(sourceInput('group-0').value).toBe('Station météo')
      expect(getButton('apply').disabled).toBe(true)
    })
  })

  describe('freshness', () => {
    it('should refetch a stale page and skip the build entirely', async () => {
      const stamped = document.createElement('link')
      stamped.setAttribute('href', 'styles.css?v=aaaa1111')
      document.head.append(stamped)
      const { api, ready } = await bootPage({
        routes: {
          ...defaultRoutes(),
          'GET /webview-hashes': { settings: 'bbbb2222' },
        },
      })

      expect(api).toHaveBeenCalledWith(
        'POST',
        '/boot-error',
        expect.objectContaining({ name: 'WebviewFreshness' }),
        expect.any(Function),
      )
      expect(api).not.toHaveBeenCalledWith(
        'GET',
        '/devices/groups',
        expect.any(Function),
      )
      expect(ready).not.toHaveBeenCalled()
    })

    it('should re-run the handshake on the app boot poke', async () => {
      const { emit } = await bootPage()

      emit('webview_hashes_changed')
      await settleDetached()

      expect(logRows()).toHaveLength(0)
    })
  })
})
