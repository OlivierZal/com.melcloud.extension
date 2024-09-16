import type Homey from 'homey/lib/HomeySettings'

import type {
  CapabilityPath,
  HomeySettingsUI,
  TemperatureListenerData,
  TemperatureSensor,
  TimestampedLog,
} from '../types'

const LOG_RETENTION_DAYS = 6
const TIME_ZERO = 0

const categories: Record<string, { color?: string; icon: string }> = {
  calculated: { color: '#008000', icon: '🔢' },
  cleaned: { icon: '🗑️' },
  cleanedAll: { icon: '🛑' },
  created: { icon: '🔊' },
  error: { color: '#E8000D', icon: '⚠️' },
  listened: { color: '#0047AB', icon: '👂' },
  reverted: { icon: '↩️' },
  saved: { icon: '☁️' },
}

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

const applyElement = document.getElementById('apply') as HTMLButtonElement
const refreshElement = document.getElementById('refresh') as HTMLButtonElement
const capabilityPathElement = document.getElementById(
  'capability_path',
) as HTMLSelectElement
const enabledElement = document.getElementById('enabled') as HTMLSelectElement
const logsElement = document.getElementById('logs') as HTMLTableSectionElement

capabilityPathElement.addEventListener('change', () => {
  if (enabledElement.value === 'false') {
    enabledElement.value = 'true'
  }
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
  const { color, icon } = categories[category ?? 'error']
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
  if (errorMessage !== 'no_device_ata') {
    await homey.alert(errorMessage)
    return
  }
  homey.confirm(
    homey.__('settings.no_device_ata'),
    null,
    async (error: Error | null, ok: boolean) => {
      if (error) {
        await homey.alert(error.message)
      }
      if (ok) {
        await homey.openURL('https://homey.app/a/com.mecloud')
      }
    },
  )
}

const fetchHomeySettings = async (homey: Homey): Promise<void> => {
  let homeySettings: HomeySettingsUI = {}
  await withDisablingButtons(
    async () =>
      new Promise((resolve) => {
        homey.get(async (error: Error | null, settings: HomeySettingsUI) => {
          if (error) {
            await homey.alert(error.message)
          }
          homeySettings = settings
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
      .reverse()
      .forEach(displayLog)
  }
  capabilityPathElement.value = homeySettings.capabilityPath ?? ''
  enabledElement.value = String(homeySettings.enabled === true)
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
            const optionElement = document.createElement('option')
            optionElement.value = capabilityPath
            optionElement.innerText = capabilityName
            capabilityPathElement.append(optionElement)
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
            capabilityPath: capabilityPathElement.value as CapabilityPath,
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

// eslint-disable-next-line func-style
async function onHomeyReady(homey: Homey): Promise<void> {
  await fetchLanguage(homey)
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
  await getTemperatureSensors(homey)
  await fetchHomeySettings(homey)
  await homey.ready()
}
