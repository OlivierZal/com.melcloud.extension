import type Homey from 'homey/lib/HomeySettings'
import { Temporal } from 'temporal-polyfill'

import {
  type AdjustableDevice,
  type AdjustableGroup,
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

const applyElement = getButtonElement('apply')
const emptyElement = getDivElement('empty_state')
const installElement = getButtonElement('install')
const refreshElement = getButtonElement('refresh')
const enabledElement = getSelectElement('enabled')
const logsElement = getDivElement('logs')
const sourcesElement = getDivElement('sources')

interface SourceOption {
  readonly name: string
  readonly value: string
}

// One custom combobox per building (per device without grouping): the
// dropdown is ours because iOS webviews render neither the datalist
// arrow nor showPicker. The current value lives here, keyed by device
// id — the storage unit stays the device even when a building row
// drives several of them at once.
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

// "Update" only means something once the form diverges from the last
// saved state — the snapshot greys it out otherwise.
const savedState: { value: string } = { value: '' }

const serializeState = (): string =>
  JSON.stringify([
    enabledElement.value,
    [...sourceSelections].toSorted(([id1], [id2]) => id1.localeCompare(id2)),
  ])

// Requests in flight lock BOTH buttons: `updateDirty` folds the busy
// flag in so a combobox pick mid-request cannot re-enable Update.
const busyState: { value: boolean } = { value: false }

const updateDirty = (): void => {
  applyElement.classList.toggle(
    'is-disabled',
    busyState.value || serializeState() === savedState.value,
  )
}

const resetSavedState = (): void => {
  savedState.value = serializeState()
  updateDirty()
}

// Busy buttons only grey out (com.melcloud behavior): the style
// library's `is-loading` spinner shifts the label sideways.
const setButtonsBusy = (areBusy: boolean): void => {
  busyState.value = areBusy
  refreshElement.classList.toggle('is-disabled', areBusy)
  updateDirty()
}

const withBusyButtons = async (action: () => Promise<void>): Promise<void> => {
  setButtonsBusy(true)
  try {
    await action()
  } finally {
    setButtonsBusy(false)
  }
}

// The document language is the display locale: `fetchLanguage` overwrites
// the html attribute's default with the Homey-configured language.
const absoluteTime = (time: number): string =>
  Temporal.Instant.fromEpochMilliseconds(time).toLocaleString(
    document.documentElement.lang,
    {
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      month: 'long',
      weekday: 'long',
    },
  )

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

const relativeTime = (time: number): string => {
  const elapsed = time - Temporal.Now.instant().epochMilliseconds
  const format = new Intl.RelativeTimeFormat(document.documentElement.lang, {
    numeric: 'auto',
  })
  if (Math.abs(elapsed) < HOUR_MS) {
    return format.format(Math.round(elapsed / MINUTE_MS), 'minute')
  }
  if (Math.abs(elapsed) < DAY_MS) {
    return format.format(Math.round(elapsed / HOUR_MS), 'hour')
  }
  return format.format(Math.round(elapsed / DAY_MS), 'day')
}

const createTimeElement = (time: number, icon: string): HTMLDivElement => {
  const timeElement = document.createElement('div')
  timeElement.classList.add('log-time')
  timeElement.title = absoluteTime(time)
  timeElement.append(
    document.createTextNode(relativeTime(time)),
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

// One separator above each day's logs (newest day on top)
const topDay: { value: string | null } = { value: null }

const dayOf = (time: number): string =>
  Temporal.Instant.fromEpochMilliseconds(time)
    .toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainDate()
    .toString()

const createDayElement = (time: number): HTMLDivElement => {
  const dayElement = document.createElement('div')
  dayElement.classList.add('log-day')
  dayElement.textContent = Temporal.Instant.fromEpochMilliseconds(
    time,
  ).toLocaleString(document.documentElement.lang, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  })
  return dayElement
}

const createLogRow = ({
  category,
  message,
  time,
}: TimestampedLog): HTMLDivElement => {
  const { colorClass, icon } = categories[category ?? 'error'] ?? errorCategory
  const rowElement = document.createElement('div')
  rowElement.classList.add('log-row')
  rowElement.append(
    createTimeElement(time, icon),
    createMessageElement(message, colorClass),
  )
  return rowElement
}

const displayLog = (log: TimestampedLog): void => {
  const rowElement = createLogRow(log)
  const day = dayOf(log.time)
  if (day === topDay.value) {
    // Below the day separator sitting on top
    logsElement.insertBefore(
      rowElement,
      logsElement.firstChild?.nextSibling ?? null,
    )
    return
  }
  topDay.value = day
  logsElement.insertBefore(rowElement, logsElement.firstChild)
  logsElement.insertBefore(createDayElement(log.time), rowElement)
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return typeof error === 'string' ? error : JSON.stringify(error)
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
}

const fetchLanguage = async (homey: Homey): Promise<void> => {
  document.documentElement.lang = await homeyCallback<string>((callback) => {
    homey.api('GET', '/language', callback)
  })
}

const fetchHomeySettings = async (homey: Homey): Promise<void> => {
  try {
    const settings = await homeyCallback<HomeySettings>((callback) => {
      homey.get(callback)
    })
    handleSettings(settings)
  } catch (error) {
    await homey.alert(getErrorMessage(error))
  }
}

const isNotFound = (error: unknown): boolean =>
  getErrorMessage(error) === 'notFound'

const fetchTemperatureSensors = async (
  homey: Homey,
): Promise<TemperatureSensor[]> => {
  try {
    return await homeyCallback<TemperatureSensor[]>((callback) => {
      homey.api('GET', '/devices/sensors/temperature', callback)
    })
  } catch (error) {
    if (!isNotFound(error)) {
      await homey.alert(getErrorMessage(error))
    }
    return []
  }
}

const fetchAdjustableGroups = async (
  homey: Homey,
): Promise<AdjustableGroup[]> => {
  try {
    return await homeyCallback<AdjustableGroup[]>((callback) => {
      homey.api('GET', '/devices/groups', callback)
    })
  } catch (error) {
    if (!isNotFound(error)) {
      await homey.alert(getErrorMessage(error))
    }
    return []
  }
}

// Auto-enable when the user picks a different source (UX convenience)
const enableAdjustment = (): void => {
  if (enabledElement.value === 'false') {
    enabledElement.value = 'true'
  }
  updateDirty()
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

const commonSelectionOf = (deviceIds: readonly string[]): string => {
  const values = new Set(
    deviceIds.map((deviceId) => sourceSelections.get(deviceId) ?? ''),
  )
  const [first] = values
  return values.size === 1 && first !== undefined ? first : MIXED_SELECTION
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

// A finger that scrolled the list must not pick the option it lands
// on: iOS still fires a click after a small drag, which once switched
// every device to 'Do not adjust' silently
const DRAG_SLOP_PX = 10
const dragOrigins = new WeakMap<
  HTMLUListElement,
  { clientX: number; clientY: number }
>()

const isDragClick = (list: HTMLUListElement, event: MouseEvent): boolean => {
  const origin = dragOrigins.get(list)
  return (
    origin !== undefined &&
    (Math.abs(event.clientX - origin.clientX) > DRAG_SLOP_PX ||
      Math.abs(event.clientY - origin.clientY) > DRAG_SLOP_PX)
  )
}

interface RenderOptionsParams {
  readonly filter: string
  readonly list: HTMLUListElement
  readonly selectedValue: string
  readonly onPick: (option: SourceOption) => void
}

const createOptionItem = (
  option: SourceOption,
  { list, onPick, selectedValue }: RenderOptionsParams,
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
  item.addEventListener('click', (event) => {
    if (isDragClick(list, event)) {
      return
    }
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
  list.addEventListener('pointerdown', (event) => {
    dragOrigins.set(list, { clientX: event.clientX, clientY: event.clientY })
  })
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
    list: parts.list,
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
      list,
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
const appendComboboxRow = (homey: Homey, config: ComboboxConfig): void => {
  const { element, input } = createCombobox(homey, config)
  const group = document.createElement('div')
  group.classList.add('homey-form-group')
  group.append(createComboboxLabel(config.label, input), element)
  sourcesElement.append(group)
}

// One row drives every device of the building; devices without a
// building (no grouping available) get one row each.
const appendGroupRow = (
  homey: Homey,
  group: AdjustableGroup,
  index: number,
): void => {
  const deviceIds = group.devices.map(({ id }) => id)
  appendComboboxRow(homey, {
    id: `group-${String(index)}`,
    label: group.name ?? '',
    getValue: (): string => commonSelectionOf(deviceIds),
    setValue: (value): void => {
      for (const deviceId of deviceIds) {
        sourceSelections.set(deviceId, value)
      }
    },
  })
}

const appendDeviceRow = (homey: Homey, device: AdjustableDevice): void => {
  appendComboboxRow(homey, {
    id: device.id,
    label: device.name,
    getValue: (): string => sourceSelections.get(device.id) ?? '',
    setValue: (value): void => {
      sourceSelections.set(device.id, value)
    },
  })
}

const appendSourceRows = (
  homey: Homey,
  groups: readonly AdjustableGroup[],
): void => {
  for (const [index, group] of groups.entries()) {
    if (group.name === null) {
      for (const device of group.devices) {
        appendDeviceRow(homey, device)
      }
      continue
    }
    appendGroupRow(homey, group, index)
  }
}

const populateSources = async (homey: Homey): Promise<void> => {
  const [groups, sensors] = await Promise.all([
    fetchAdjustableGroups(homey),
    fetchTemperatureSensors(homey),
  ])
  populateSourceOptions(homey, sensors)
  sourceSelections.clear()
  sourcesElement.replaceChildren()
  const devices = groups.flatMap((group) => group.devices)
  for (const device of devices) {
    sourceSelections.set(device.id, device.outdoorSource ?? '')
  }
  appendSourceRows(homey, groups)
  emptyElement.hidden = devices.length > 0
}

const getSelectedSources = (): OutdoorSources =>
  Object.fromEntries(
    sourceSelections
      .entries()
      .map(([deviceId, value]) => [deviceId, value === '' ? null : value]),
  )

const autoAdjustCooling = async (homey: Homey): Promise<void> =>
  withBusyButtons(async () => {
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
      resetSavedState()
    } catch (error) {
      await homey.alert(getErrorMessage(error))
    }
  })

// Refresh restores every value to the last saved state (the stored
// enable flag and per-device sources)
const refreshAll = async (homey: Homey): Promise<void> =>
  withBusyButtons(async () => {
    await populateSources(homey)
    await fetchHomeySettings(homey)
    resetSavedState()
  })

const addEventListeners = (homey: Homey): void => {
  refreshElement.addEventListener('click', () => {
    fireAndForget(refreshAll(homey))
  })
  applyElement.addEventListener('click', () => {
    fireAndForget(autoAdjustCooling(homey))
  })
  enabledElement.addEventListener('change', updateDirty)
  installElement.addEventListener('click', () => {
    fireAndForget(homey.openURL('https://homey.app/a/com.mecloud'))
  })
  homey.on('log', displayLog)
}

const onHomeyReady = async (homey: Homey): Promise<void> => {
  try {
    await fetchLanguage(homey)
  } catch {
    // Non-critical: the log timestamps fall back to English formatting
  }
  await refreshAll(homey)
  addEventListeners(homey)
  homey.ready()
}

Object.assign(globalThis, { onHomeyReady })
