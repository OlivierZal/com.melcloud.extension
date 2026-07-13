import type Homey from 'homey/lib/HomeySettings'
import { Temporal } from 'temporal-polyfill'

import {
  type AdjustableDevice,
  type HomeySettings,
  type OutdoorSources,
  type TemperatureListenerData,
  type TemperatureSensor,
  type TimestampedLog,
  DISABLED_SOURCE,
} from '../types.mts'

const LOG_RETENTION_DAYS = 6

interface LogCategory {
  readonly icon: string
  readonly colorClass?: string
}

const errorCategory: LogCategory = {
  colorClass: 'log-message-error',
  icon: '⚠️',
}

const categories: Partial<Record<string, LogCategory>> = {
  calculated: { colorClass: 'log-message-calculated', icon: '🔢' },
  cleaned: { icon: '🗑️' },
  cleanedAll: { icon: '🛑' },
  created: { icon: '🔊' },
  error: errorCategory,
  listened: { colorClass: 'log-message-listened', icon: '👂' },
  reverted: { icon: '↩️' },
  saved: { icon: '☁️' },
}

/**
 * Surfaces an error in the webview dev tools without blocking the caller:
 * `reportError` where the webview provides it, an async rethrow otherwise.
 */
const surfaceError = (error: unknown): void => {
  if (typeof reportError === 'function') {
    reportError(error)
    return
  }
  setTimeout(() => {
    throw error instanceof Error ? error : (
        new Error('Unhandled settings error', { cause: error })
      )
  }, 0)
}

/**
 * Runs an async operation that shouldn't block. Rejections go to `onError`
 * (default: `surfaceError`, which reports them in the webview dev tools).
 */
const fireAndForget = (
  promise: Promise<unknown>,
  onError: (error: unknown) => void = surfaceError,
): void => {
  // eslint-disable-next-line unicorn/prefer-await -- fire-and-forget: rejections route to onError without blocking the caller
  promise.catch(onError)
}

// Promisifies Homey Settings API callbacks (error-first convention)
const homeyCallback = async <T,>(
  call: (callback: (error: Error | null, result: T) => void) => void,
): Promise<T> =>
  new Promise((resolve, reject) => {
    call((error, result) => {
      if (error !== null) {
        reject(error)
        return
      }
      resolve(result)
    })
  })

const getElement = <T extends HTMLElement>(
  id: string,
  elementConstructor: new () => T,
  elementType: string,
): T => {
  const element = document.querySelector(`#${id}`)
  if (!(element instanceof elementConstructor)) {
    throw new TypeError(`Element with id \`${id}\` is not a ${elementType}`)
  }
  return element
}

const getButtonElement = (id: string): HTMLButtonElement =>
  getElement(id, HTMLButtonElement, 'button')

const getSelectElement = (id: string): HTMLSelectElement =>
  getElement(id, HTMLSelectElement, 'select')

const getDivElement = (id: string): HTMLDivElement =>
  getElement(id, HTMLDivElement, 'div')

const getTableSectionElement = (id: string): HTMLTableSectionElement =>
  getElement(id, HTMLTableSectionElement, 'table section')

const getDetailsElement = (id: string): HTMLDetailsElement =>
  getElement(id, HTMLDetailsElement, 'details')

const applyElement = getButtonElement('apply')
const configurationElement = getDetailsElement('configuration')
const refreshElement = getButtonElement('refresh')
const enabledElement = getSelectElement('enabled')
const logsElement = getTableSectionElement('logs')
const sourcesElement = getDivElement('sources')

// Created here rather than in the static page: its options are fully
// dynamic, and the settings webview is Homey's Chromium (datalist sits
// below the html/use-baseline bar on paper only).
const sourceOptionsElement = document.createElement('datalist')
sourceOptionsElement.id = 'source_options'
sourcesElement.after(sourceOptionsElement)

const sourceSelects = new Map<string, HTMLSelectElement>()
// Mirrors of the select options, shared by every autocomplete input
const sourceNamesByValue = new Map<string, string>()
const sourceValuesByName = new Map<string, string>()

const setButtonsEnabled = (isEnabled: boolean): void => {
  for (const element of [applyElement, refreshElement]) {
    element.classList.toggle('is-disabled', !isEnabled)
  }
}

const withDisablingButtons = async (
  action: () => Promise<void>,
): Promise<void> => {
  setButtonsEnabled(false)
  await action()
  setButtonsEnabled(true)
}

// The document language is the display locale: `fetchLanguage` overwrites
// the html attribute's default with the Homey-configured language.
const displayTime = (time: number): string =>
  Temporal.Instant.fromEpochMilliseconds(time).toLocaleString(
    document.documentElement.lang,
    {
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    },
  )

const createTimeElement = (time: number, icon: string): HTMLDivElement => {
  const timeElement = document.createElement('div')
  timeElement.classList.add('log-time')
  timeElement.append(
    document.createTextNode(displayTime(time)),
    document.createElement('br'),
    document.createTextNode(icon),
  )
  return timeElement
}

const createMessageElement = (
  message: string,
  colorClass?: string,
): HTMLDivElement => {
  const messageElement = document.createElement('div')
  if (colorClass !== undefined) {
    messageElement.classList.add(colorClass)
  }
  messageElement.textContent = message
  return messageElement
}

const displayLog = ({ category, message, time }: TimestampedLog): void => {
  const { colorClass, icon } = categories[category ?? 'error'] ?? errorCategory
  const rowElement = document.createElement('div')
  rowElement.classList.add('log-row')
  rowElement.append(
    createTimeElement(time, icon),
    createMessageElement(message, colorClass),
  )
  logsElement.insertBefore(rowElement, logsElement.firstChild)
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return typeof error === 'string' ? error : JSON.stringify(error)
}

const handleTemperatureSensorsError = async (
  homey: Homey,
  errorMessage: string,
): Promise<void> => {
  if (errorMessage !== 'notFound') {
    await homey.alert(errorMessage)
    return
  }
  const shouldInstall = await homeyCallback<boolean>((callback) => {
    homey.confirm(homey.__('settings.notFound'), null, callback)
  })
  if (shouldInstall) {
    await homey.openURL('https://homey.app/a/com.mecloud')
  }
}

// Only show logs from the last LOG_RETENTION_DAYS (midnight cutoff)
const getOldestDisplayableInstant = (): Temporal.Instant =>
  Temporal.Now.zonedDateTimeISO()
    .subtract({ days: LOG_RETENTION_DAYS })
    .startOfDay()
    .toInstant()

const displayRetainedLogs = (logs: readonly TimestampedLog[]): void => {
  if (logsElement.childElementCount > 0) {
    return
  }
  const oldestInstant = getOldestDisplayableInstant()
  const retainedLogs = logs
    .filter(
      ({ time }) =>
        Temporal.Instant.compare(
          Temporal.Instant.fromEpochMilliseconds(time),
          oldestInstant,
        ) >= 0,
    )
    .toReversed()
  for (const log of retainedLogs) {
    displayLog(log)
  }
}

const handleSettings = (settings: HomeySettings): void => {
  displayRetainedLogs(settings.lastLogs ?? [])
  enabledElement.value = String(settings.isEnabled === true)
  // Not adjusting yet: surface the configuration; already running:
  // fold it away so the history is one glance away.
  configurationElement.open = settings.isEnabled !== true
}

const fetchLanguage = async (homey: Homey): Promise<void> => {
  document.documentElement.lang = await homeyCallback<string>((callback) => {
    homey.api('GET', '/language', callback)
  })
}

const fetchHomeySettings = async (homey: Homey): Promise<void> =>
  withDisablingButtons(async () => {
    try {
      const settings = await homeyCallback<HomeySettings>((callback) => {
        homey.get(callback)
      })
      handleSettings(settings)
    } catch (error) {
      await homey.alert(getErrorMessage(error))
    }
  })

const fetchTemperatureSensors = async (
  homey: Homey,
): Promise<TemperatureSensor[]> => {
  try {
    return await homeyCallback<TemperatureSensor[]>((callback) => {
      homey.api('GET', '/devices/sensors/temperature', callback)
    })
  } catch (error) {
    await handleTemperatureSensorsError(homey, getErrorMessage(error))
    return []
  }
}

const fetchAdjustableDevices = async (
  homey: Homey,
): Promise<AdjustableDevice[]> => {
  try {
    return await homeyCallback<AdjustableDevice[]>((callback) => {
      homey.api('GET', '/devices/adjustable', callback)
    })
  } catch (error) {
    await handleTemperatureSensorsError(homey, getErrorMessage(error))
    return []
  }
}

// Auto-enable when the user picks a different source (UX convenience)
const enableAdjustment = (): void => {
  if (enabledElement.value === 'false') {
    enabledElement.value = 'true'
  }
}

const registerSourceOption = (name: string, value: string): void => {
  sourceNamesByValue.set(value, name)
  sourceValuesByName.set(name.toLowerCase(), value)
  sourceOptionsElement.append(new Option(name))
}

const populateSourceOptions = (
  homey: Homey,
  sensors: readonly TemperatureSensor[],
): void => {
  sourceOptionsElement.replaceChildren()
  sourceNamesByValue.clear()
  sourceValuesByName.clear()
  registerSourceOption(homey.__('settings.disabledSource'), DISABLED_SOURCE)
  registerSourceOption(homey.__('settings.defaultSource'), '')
  for (const { capabilityName, capabilityPath } of sensors) {
    registerSourceOption(capabilityName, capabilityPath)
  }
}

const createSourceSelect = (
  homey: Homey,
  device: AdjustableDevice,
  sensors: readonly TemperatureSensor[],
): HTMLSelectElement => {
  const select = document.createElement('select')
  select.classList.add('homey-form-select')
  select.id = `source-${device.id}`
  select.append(
    new Option(homey.__('settings.disabledSource'), DISABLED_SOURCE),
    new Option(homey.__('settings.defaultSource'), ''),
  )
  for (const { capabilityName, capabilityPath } of sensors) {
    select.append(new Option(capabilityName, capabilityPath))
  }
  select.value = device.outdoorSource ?? ''
  select.addEventListener('change', enableAdjustment)
  return select
}

// Autocomplete companion: a text input backed by the shared datalist.
// A recognized name drives the select; anything else snaps back to the
// select's current choice on change/blur.
const createSourceSearch = (
  homey: Homey,
  device: AdjustableDevice,
  select: HTMLSelectElement,
): HTMLInputElement => {
  const search = document.createElement('input')
  search.classList.add('homey-form-input', 'source-search')
  search.id = `search-${device.id}`
  search.setAttribute('list', 'source_options')
  search.placeholder = homey.__('settings.searchSource')
  search.ariaLabel = `${device.name} — ${homey.__('settings.searchSource')}`
  search.value = sourceNamesByValue.get(select.value) ?? ''
  search.addEventListener('change', () => {
    const value = sourceValuesByName.get(search.value.trim().toLowerCase())
    if (value === undefined) {
      search.value = sourceNamesByValue.get(select.value) ?? ''
      return
    }
    select.value = value
    search.value = sourceNamesByValue.get(value) ?? ''
    enableAdjustment()
  })
  select.addEventListener('change', () => {
    search.value = sourceNamesByValue.get(select.value) ?? ''
  })
  return search
}

const createSourceLabel = (
  device: AdjustableDevice,
  select: HTMLSelectElement,
): HTMLLabelElement => {
  const label = document.createElement('label')
  label.classList.add('homey-form-label')
  label.htmlFor = select.id
  label.textContent = device.name
  return label
}

// Homey Style Library idiom (settings pages, unlike widgets, use it):
// one form group per field, the control a SIBLING after its label.
const appendSourceRow = (
  homey: Homey,
  device: AdjustableDevice,
  sensors: readonly TemperatureSensor[],
): void => {
  const select = createSourceSelect(homey, device, sensors)
  sourceSelects.set(device.id, select)
  const group = document.createElement('div')
  group.classList.add('homey-form-group')
  group.append(
    createSourceLabel(device, select),
    createSourceSearch(homey, device, select),
    select,
  )
  sourcesElement.append(group)
}

const populateSources = async (homey: Homey): Promise<void> => {
  const [devices, sensors] = await Promise.all([
    fetchAdjustableDevices(homey),
    fetchTemperatureSensors(homey),
  ])
  populateSourceOptions(homey, sensors)
  sourceSelects.clear()
  sourcesElement.replaceChildren()
  for (const device of devices) {
    appendSourceRow(homey, device, sensors)
  }
}

const getSelectedSources = (): OutdoorSources =>
  Object.fromEntries(
    sourceSelects
      .entries()
      .map(([deviceId, select]) => [
        deviceId,
        select.value === '' ? null : select.value,
      ]),
  )

const autoAdjustCooling = async (homey: Homey): Promise<void> =>
  withDisablingButtons(async () => {
    try {
      await homeyCallback<undefined>((callback) => {
        homey.api(
          'PUT',
          '/melcloud/cooling/auto_adjustment',
          {
            isEnabled: enabledElement.value === 'true',
            outdoorSources: getSelectedSources(),
          } satisfies TemperatureListenerData,
          callback,
        )
      })
    } catch (error) {
      await homey.alert(getErrorMessage(error))
    }
  })

const addEventListeners = (homey: Homey): void => {
  refreshElement.addEventListener('click', () => {
    fireAndForget(fetchHomeySettings(homey))
  })
  applyElement.addEventListener('click', () => {
    fireAndForget(autoAdjustCooling(homey))
  })
  homey.on('log', displayLog)
}

const onHomeyReady = async (homey: Homey): Promise<void> => {
  try {
    await fetchLanguage(homey)
  } catch {
    // Non-critical: the log timestamps fall back to English formatting
  }
  await populateSources(homey)
  await fetchHomeySettings(homey)
  addEventListeners(homey)
  homey.ready()
}

Object.assign(globalThis, { onHomeyReady })
