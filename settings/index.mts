import type Homey from 'homey/lib/HomeySettings'
import { Temporal } from 'temporal-polyfill'

import type {
  HomeySettings,
  TemperatureListenerData,
  TemperatureSensor,
  TimestampedLog,
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

const getTableSectionElement = (id: string): HTMLTableSectionElement =>
  getElement(id, HTMLTableSectionElement, 'table section')

const applyElement = getButtonElement('apply')
const refreshElement = getButtonElement('refresh')
const capabilityPathElement = getSelectElement('capability_path')
const enabledElement = getSelectElement('enabled')
const logsElement = getTableSectionElement('logs')

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
  capabilityPathElement.value = settings.capabilityPath ?? ''
  enabledElement.value = String(settings.isEnabled === true)
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

const populateTemperatureSensors = async (homey: Homey): Promise<void> => {
  const sensors = await fetchTemperatureSensors(homey)
  for (const { capabilityName, capabilityPath } of sensors) {
    capabilityPathElement.append(new Option(capabilityName, capabilityPath))
  }
}

const autoAdjustCooling = async (homey: Homey): Promise<void> =>
  withDisablingButtons(async () => {
    try {
      await homeyCallback<undefined>((callback) => {
        homey.api(
          'PUT',
          '/melcloud/cooling/auto_adjustment',
          {
            capabilityPath: capabilityPathElement.value,
            isEnabled: enabledElement.value === 'true',
          } satisfies TemperatureListenerData,
          callback,
        )
      })
    } catch (error) {
      await homey.alert(getErrorMessage(error))
    }
  })

const addEventListeners = (homey: Homey): void => {
  // Auto-enable when the user selects a different sensor (UX convenience)
  capabilityPathElement.addEventListener('change', () => {
    if (enabledElement.value === 'false') {
      enabledElement.value = 'true'
    }
  })
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
  await populateTemperatureSensors(homey)
  await fetchHomeySettings(homey)
  addEventListeners(homey)
  homey.ready()
}

Object.assign(globalThis, { onHomeyReady })
