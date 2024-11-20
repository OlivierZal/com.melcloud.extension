import type Homey from 'homey/lib/HomeySettings'

import type {
  HomeySettingsUI,
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
} as const

const getButtonElement = (id: string): HTMLButtonElement => {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Element with id \`${id}\` is not a button`)
  }
  return element
}

const getSelectElement = (id: string): HTMLSelectElement => {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Element with id \`${id}\` is not a select`)
  }
  return element
}

const getTableSectionElement = (id: string): HTMLTableSectionElement => {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLTableSectionElement)) {
    throw new Error(`Element with id "${id}" is not a table`)
  }
  return element
}

const applyElement = getButtonElement('apply')
const refreshElement = getButtonElement('refresh')
const capabilityPathElement = getSelectElement('capability_path')
const enabledElement = getSelectElement('enabled')
const logsElement = getTableSectionElement('logs')

let language = 'en'

const fetchLanguage = async (homey: Homey): Promise<void> =>
  new Promise((resolve) => {
    homey.api('GET', '/language', (error: Error | null, lang: string) => {
      if (!error) {
        document.documentElement.lang = lang
        language = lang
      }
      resolve()
    })
  })

const disableButtons = (value = true): void => {
  ;[applyElement, refreshElement].forEach((element) => {
    if (value) {
      element.classList.add('is-disabled')
      return
    }
    element.classList.remove('is-disabled')
  })
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
  timeElement.innerHTML = `${displayTime(time)}<br>${icon}`
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
  messageElement.innerText = message
  return messageElement
}

const displayLog = ({ category, message, time }: TimestampedLog): void => {
  const {
    [category ?? 'error']: { color, icon },
  } = categories
  const timeElement = createTimeElement(time, icon)
  const messageElement = createMessageElement(message, color)
  const rowElement = document.createElement('div')
  rowElement.style.display = 'flex'
  rowElement.style.marginBottom = '1em'
  rowElement.append(timeElement, messageElement)
  logsElement.insertBefore(rowElement, logsElement.firstChild)
}

const handleTemperatureSensorsError = async (
  homey: Homey,
  errorMessage: string,
): Promise<void> => {
  if (errorMessage === 'ataDeviceNotFound') {
    homey.confirm(
      homey.__('settings.ataDeviceNotFound'),
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

const fetchHomeySettings = async (homey: Homey): Promise<void> => {
  let homeySettings: HomeySettingsUI = {}
  await withDisablingButtons(
    async () =>
      new Promise((resolve) => {
        homey.get(async (error: Error | null, settings: HomeySettingsUI) => {
          if (error) {
            await homey.alert(error.message)
          } else {
            homeySettings = settings
          }
          resolve()
        })
      }),
  )
  if (!logsElement.childElementCount) {
    ;(homeySettings.lastLogs ?? [])
      .filter(({ time }) => {
        const date = new Date(time)
        const oldestDate = new Date()
        oldestDate.setDate(oldestDate.getDate() - LOG_RETENTION_DAYS)
        oldestDate.setHours(TIME_ZERO, TIME_ZERO, TIME_ZERO, TIME_ZERO)
        return date >= oldestDate
      })
      .toReversed()
      .forEach(displayLog)
  }
  capabilityPathElement.value = homeySettings.capabilityPath ?? ''
  enabledElement.value = String(homeySettings.isEnabled === true)
}

const getTemperatureSensors = async (homey: Homey): Promise<void> =>
  new Promise((resolve) => {
    homey.api(
      'GET',
      '/devices/sensors/temperature',
      async (error: Error | null, devices: TemperatureSensor[]) => {
        if (error) {
          await handleTemperatureSensorsError(homey, error.message)
        } else {
          devices.forEach(({ capabilityName, capabilityPath }) => {
            capabilityPathElement.append(
              new Option(capabilityName, capabilityPath),
            )
          })
        }
        resolve()
      },
    )
  })

const autoAdjustCooling = async (homey: Homey): Promise<void> =>
  withDisablingButtons(
    async () =>
      new Promise((resolve) => {
        homey.api(
          'PUT',
          '/melcloud/cooling/auto_adjustment',
          {
            capabilityPath: capabilityPathElement.value,
            isEnabled: enabledElement.value === 'true',
          } satisfies TemperatureListenerData,
          async (error: Error | null) => {
            if (error) {
              await homey.alert(error.message)
            }
            resolve()
          },
        )
      }),
  )

const addEventListeners = (homey: Homey): void => {
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

// eslint-disable-next-line func-style
async function onHomeyReady(homey: Homey): Promise<void> {
  await fetchLanguage(homey)
  await getTemperatureSensors(homey)
  await fetchHomeySettings(homey)
  addEventListeners(homey)
  homey.ready()
}
