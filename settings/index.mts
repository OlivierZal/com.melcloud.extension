import type Homey from 'homey/lib/HomeySettings'

import type {
  HomeySettings,
  TemperatureListenerData,
  TemperatureSensor,
  TimestampedLog,
} from '../types.mts'

const LOG_RETENTION_DAYS = 6
const TIME_ZERO = 0

const categories: Record<string, { icon: string; color?: string }> = {
  calculated: { color: '#008000', icon: '🔢' },
  cleaned: { icon: '🗑️' },
  cleanedAll: { icon: '🛑' },
  created: { icon: '🔊' },
  error: { color: '#E8000D', icon: '⚠️' },
  listened: { color: '#0047AB', icon: '👂' },
  reverted: { icon: '↩️' },
  saved: { icon: '☁️' },
}

// Promisifies Homey Settings API callbacks (error-first convention)
const homeyCallback = async <T,>(
  call: (callback: (error: Error | null, result: T) => void) => void,
): Promise<T> =>
  new Promise((resolve, reject) => {
    call((error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result)
    })
  })

const getElement = <T extends HTMLElement,>(
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

let language = 'en'

const disableButtons = (value = true): void => {
  for (const element of [applyElement, refreshElement]) {
    if (value) {
      element.classList.add('is-disabled')
      continue
    }
    element.classList.remove('is-disabled')
  }
}

const enableButtons = (value = true): void => {
  disableButtons(!value)
}

const withDisablingButtons = async (
  action: () => Promise<void>,
): Promise<void> => {
  disableButtons()
  await action()
  enableButtons()
}

const displayTime = (time: number): string =>
  new Date(time).toLocaleString(language, {
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  })

const createTimeElement = (time: number, icon: string): HTMLDivElement => {
  const timeElement = document.createElement('div')
  timeElement.style.color = '#888'
  timeElement.style.flexShrink = '0'
  timeElement.style.marginRight = '1em'
  timeElement.style.textAlign = 'center'
  timeElement.style.whiteSpace = 'nowrap'
  timeElement.append(
    document.createTextNode(displayTime(time)),
    document.createElement('br'),
    document.createTextNode(icon),
  )
  return timeElement
}

const createMessageElement = (
  message: string,
  color?: string,
): HTMLDivElement => {
  const messageElement = document.createElement('div')
  if (color !== undefined) {
    messageElement.style.color = color
  }
  messageElement.textContent = message
  return messageElement
}

const displayLog = ({ category, message, time }: TimestampedLog): void => {
  const newCategory = categories[category ?? 'error'] ?? categories['error']
  if (newCategory) {
    const { color, icon } = newCategory
    const timeElement = createTimeElement(time, icon)
    const messageElement = createMessageElement(message, color)
    const rowElement = document.createElement('div')
    rowElement.style.display = 'flex'
    rowElement.style.marginBottom = '1em'
    rowElement.append(timeElement, messageElement)
    logsElement.insertBefore(rowElement, logsElement.firstChild)
  }
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const handleTemperatureSensorsError = async (
  homey: Homey,
  errorMessage: string,
): Promise<void> => {
  if (errorMessage === 'notFound') {
    homey.confirm(
      homey.__('settings.notFound'),
      null,
      async (error: Error | null, ok: boolean) => {
        if (error) {
          await homey.alert(error.message)
          return
        }
        if (ok) {
          await homey.openURL('https://homey.app/a/com.mecloud')
        }
      },
    )
    return
  }
  await homey.alert(errorMessage)
}

const handleSettings = (settings: HomeySettings): void => {
  if (!logsElement.childElementCount) {
    for (const log of (settings.lastLogs ?? [])
      // Only show logs from the last LOG_RETENTION_DAYS (midnight cutoff)
      .filter(({ time }) => {
        const date = new Date(time)
        const oldestDate = new Date()
        oldestDate.setDate(oldestDate.getDate() - LOG_RETENTION_DAYS)
        oldestDate.setHours(TIME_ZERO, TIME_ZERO, TIME_ZERO, TIME_ZERO)
        return date >= oldestDate
      })
      .toReversed()) {
      displayLog(log)
    }
  }
  capabilityPathElement.value = settings.capabilityPath ?? ''
  enabledElement.value = String(settings.isEnabled === true)
}

const fetchLanguage = async (homey: Homey): Promise<void> => {
  try {
    const lang = await homeyCallback<string>((callback) => {
      homey.api('GET', '/language', callback)
    })
    document.documentElement.lang = lang
    language = lang
  } catch {}
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

const getTemperatureSensors = async (homey: Homey): Promise<void> => {
  try {
    const devices = await homeyCallback<TemperatureSensor[]>((callback) => {
      homey.api('GET', '/devices/sensors/temperature', callback)
    })
    for (const { capabilityName, capabilityPath } of devices) {
      capabilityPathElement.append(new Option(capabilityName, capabilityPath))
    }
  } catch (error) {
    await handleTemperatureSensorsError(homey, getErrorMessage(error))
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
    fetchHomeySettings(homey).catch(() => {
      //
    })
  })
  applyElement.addEventListener('click', () => {
    autoAdjustCooling(homey).catch(() => {
      //
    })
  })
  homey.on('log', displayLog)
}

// @ts-expect-error: read by another script in `./index.html`
// eslint-disable-next-line func-style
async function onHomeyReady(homey: Homey): Promise<void> {
  await fetchLanguage(homey)
  await getTemperatureSensors(homey)
  await fetchHomeySettings(homey)
  addEventListeners(homey)
  homey.ready()
}
