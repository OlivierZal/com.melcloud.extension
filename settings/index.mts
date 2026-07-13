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

interface SourceOption {
  readonly name: string
  readonly value: string
}

// One custom combobox per device (iOS webviews render neither the
// datalist arrow nor showPicker, so the dropdown is ours): clicking the
// field drops the FULL list select-style, typing filters it, and the
// current value lives here, keyed by device id.
const sourceOptions: SourceOption[] = []
const sourceSelections = new Map<string, string>()
const sourceNamesByValue = new Map<string, string>()

// At most one list is open; opening another (or clicking away) closes it
const openCombobox: { close: (() => void) | null } = { close: null }

const closeOpenCombobox = (): void => {
  openCombobox.close?.()
  openCombobox.close = null
}

document.addEventListener('pointerdown', (event) => {
  if (
    event.target instanceof Element &&
    event.target.closest('.combobox') !== null
  ) {
    return
  }
  closeOpenCombobox()
})

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
  sourceOptions.push({ name, value })
}

const populateSourceOptions = (
  homey: Homey,
  sensors: readonly TemperatureSensor[],
): void => {
  sourceOptions.length = 0
  sourceNamesByValue.clear()
  registerSourceOption(homey.__('settings.disabledSource'), DISABLED_SOURCE)
  registerSourceOption(homey.__('settings.defaultSource'), '')
  for (const { capabilityName, capabilityPath } of sensors) {
    registerSourceOption(capabilityName, capabilityPath)
  }
}

// Sentinel displayed as an empty field when the devices diverge — it
// can never match a real option, so no checkmark shows either
const MIXED_SELECTION = '\u{0}'

const sourceInputs = new Map<string, HTMLInputElement>()
const bulkInputHolder: { input: HTMLInputElement | null } = { input: null }

const commonSelection = (): string => {
  const values = new Set(sourceSelections.values())
  const [first] = values
  return values.size === 1 && first !== undefined ? first : MIXED_SELECTION
}

const refreshDisplays = (): void => {
  for (const [deviceId, input] of sourceInputs) {
    input.value =
      sourceNamesByValue.get(sourceSelections.get(deviceId) ?? '') ?? ''
  }
  if (bulkInputHolder.input !== null) {
    bulkInputHolder.input.value =
      sourceNamesByValue.get(commonSelection()) ?? ''
  }
}

interface ComboboxConfig {
  readonly id: string
  readonly label: string
  readonly getValue: () => string
  readonly setValue: (value: string) => void
}

const createComboboxInput = (
  homey: Homey,
  config: ComboboxConfig,
): HTMLInputElement => {
  const input = document.createElement('input')
  input.type = 'text'
  // Select-like on touch devices: the first tap drops the list without
  // summoning the keyboard; a second tap switches to typing mode.
  input.inputMode = 'none'
  input.classList.add('homey-form-input', 'combobox-input')
  input.id = `source-${config.id}`
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-expanded', 'false')
  input.placeholder = homey.__('settings.searchSource')
  input.ariaLabel = `${config.label} — ${homey.__('settings.searchSource')}`
  return input
}

interface RenderOptionsParams {
  readonly filter: string
  readonly selectedValue: string
  readonly onPick: (option: SourceOption) => void
}

const createOptionItem = (
  option: SourceOption,
  { onPick, selectedValue }: RenderOptionsParams,
): HTMLLIElement => {
  const item = document.createElement('li')
  item.classList.add('combobox-option')
  item.classList.toggle('is-selected', option.value === selectedValue)
  item.setAttribute('role', 'option')
  item.setAttribute(
    'aria-selected',
    option.value === selectedValue ? 'true' : 'false',
  )
  item.textContent = option.name
  // click, not pointerdown: a touch drag must scroll the list, not pick
  item.addEventListener('click', () => {
    onPick(option)
  })
  return item
}

const renderOptions = (
  list: HTMLUListElement,
  params: RenderOptionsParams,
): void => {
  const needle = params.filter.trim().toLowerCase()
  const matches =
    needle === '' ? sourceOptions : (
      sourceOptions.filter(({ name }) => name.toLowerCase().includes(needle))
    )
  list.replaceChildren(
    ...matches.map((option) => createOptionItem(option, params)),
  )
}

const createSourceList = (): HTMLUListElement => {
  const list = document.createElement('ul')
  list.classList.add('combobox-list')
  list.setAttribute('role', 'listbox')
  list.hidden = true
  return list
}

interface ComboboxParts {
  readonly input: HTMLInputElement
  readonly list: HTMLUListElement
}

const closeList = (
  { input, list }: ComboboxParts,
  config: ComboboxConfig,
): void => {
  list.hidden = true
  input.setAttribute('aria-expanded', 'false')
  input.inputMode = 'none'
  input.value = sourceNamesByValue.get(config.getValue()) ?? ''
}

const openList = (
  parts: ComboboxParts,
  config: ComboboxConfig,
  onPick: (option: SourceOption) => void,
): void => {
  closeOpenCombobox()
  renderOptions(parts.list, {
    filter: '',
    onPick,
    selectedValue: config.getValue(),
  })
  parts.list.hidden = false
  parts.input.setAttribute('aria-expanded', 'true')
  parts.list.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' })
  openCombobox.close = (): void => {
    closeList(parts, config)
  }
}

const wireCombobox = (parts: ComboboxParts, config: ComboboxConfig): void => {
  const { input, list } = parts
  const pick = (option: SourceOption): void => {
    config.setValue(option.value)
    enableAdjustment()
    closeOpenCombobox()
    input.blur()
  }
  // Clicking anywhere in the field drops the FULL list, select-style;
  // clicking again summons the keyboard to filter by typing
  input.addEventListener('click', () => {
    if (list.hidden === true) {
      openList(parts, config, pick)
      return
    }
    if (input.inputMode === 'none') {
      input.inputMode = 'text'
      input.blur()
      input.focus()
    }
  })
  input.addEventListener('input', () => {
    if (list.hidden === true) {
      openList(parts, config, pick)
    }
    renderOptions(list, {
      filter: input.value,
      onPick: pick,
      selectedValue: config.getValue(),
    })
  })
}

const createCombobox = (
  homey: Homey,
  config: ComboboxConfig,
): { element: HTMLDivElement; input: HTMLInputElement } => {
  const input = createComboboxInput(homey, config)
  const list = createSourceList()
  input.value = sourceNamesByValue.get(config.getValue()) ?? ''
  wireCombobox({ input, list }, config)
  const element = document.createElement('div')
  element.classList.add('combobox')
  element.append(input, list)
  return { element, input }
}

const createComboboxLabel = (
  text: string,
  input: HTMLInputElement,
): HTMLLabelElement => {
  const label = document.createElement('label')
  label.classList.add('homey-form-label')
  label.htmlFor = input.id
  label.textContent = text
  return label
}

// Homey Style Library idiom (settings pages, unlike widgets, use it):
// one form group per field, the control a SIBLING after its label.
const appendComboboxRow = (
  homey: Homey,
  config: ComboboxConfig,
): HTMLInputElement => {
  const { element, input } = createCombobox(homey, config)
  const group = document.createElement('div')
  group.classList.add('homey-form-group')
  group.append(createComboboxLabel(config.label, input), element)
  sourcesElement.append(group)
  return input
}

const appendDeviceRow = (homey: Homey, device: AdjustableDevice): void => {
  const input = appendComboboxRow(homey, {
    id: device.id,
    label: device.name,
    getValue: (): string => sourceSelections.get(device.id) ?? '',
    setValue: (value): void => {
      sourceSelections.set(device.id, value)
      refreshDisplays()
    },
  })
  sourceInputs.set(device.id, input)
}

// Bulk row: one pick applies the source to every device below
const appendBulkRow = (homey: Homey): void => {
  bulkInputHolder.input = appendComboboxRow(homey, {
    getValue: commonSelection,
    id: 'all',
    label: homey.__('settings.allDevices'),
    setValue: (value): void => {
      for (const deviceId of sourceSelections.keys()) {
        sourceSelections.set(deviceId, value)
      }
      refreshDisplays()
    },
  })
}

const resetSources = (): void => {
  sourceSelections.clear()
  sourceInputs.clear()
  bulkInputHolder.input = null
  sourcesElement.replaceChildren()
}

const appendSourceRows = (
  homey: Homey,
  devices: readonly AdjustableDevice[],
): void => {
  if (devices.length > 0) {
    appendBulkRow(homey)
  }
  for (const device of devices) {
    appendDeviceRow(homey, device)
  }
  refreshDisplays()
}

const populateSources = async (homey: Homey): Promise<void> => {
  const [devices, sensors] = await Promise.all([
    fetchAdjustableDevices(homey),
    fetchTemperatureSensors(homey),
  ])
  populateSourceOptions(homey, sensors)
  resetSources()
  for (const device of devices) {
    sourceSelections.set(device.id, device.outdoorSource ?? '')
  }
  appendSourceRows(homey, devices)
}

const getSelectedSources = (): OutdoorSources =>
  Object.fromEntries(
    sourceSelections
      .entries()
      .map(([deviceId, value]) => [deviceId, value === '' ? null : value]),
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
