import type Homey from 'homey/lib/HomeySettings'

import type {
  CapabilityPath,
  HomeySettingsUI,
  TemperatureListenerData,
  TemperatureSensor,
  TimestampedLog,
} from '../types'

const CATEGORIES: Record<string, { color?: string; icon: string }> = {
  calculated: { color: '#008000', icon: '🔢' },
  cleaned: { icon: '🗑️' },
  cleanedAll: { icon: '🛑' },
  created: { icon: '🔊' },
  error: { color: '#E8000D', icon: '⚠️' },
  listened: { color: '#0047AB', icon: '👂' },
  reverted: { icon: '↩️' },
  saved: { icon: '☁️' },
}
const DAYS_6 = 6
const NUMBER_0 = 0

let language = ''

const getLanguage = async (homey: Homey): Promise<void> =>
  new Promise((resolve, reject) => {
    homey.api('GET', '/language', (error: Error | null, lang: string) => {
      if (error) {
        reject(error)
        return
      }
      language = lang
      resolve()
    })
  })

const applyElement = document.getElementById('apply') as HTMLButtonElement
const refreshElement = document.getElementById('refresh') as HTMLButtonElement
const capabilityPathElement = document.getElementById(
  'capabilityPath',
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
  if (typeof color !== 'undefined') {
    messageElement.style.color = color
  }
  messageElement.innerText = message
  return messageElement
}

const displayLog = ({ category, message, time }: TimestampedLog): void => {
  const { color, icon } = CATEGORIES[category ?? 'error']
  const timeElement = createTimeElement(time, icon)
  const messageElement = createMessageElement(message, color)
  const rowElement = document.createElement('div')
  rowElement.style.display = 'flex'
  rowElement.style.marginBottom = '1em'
  rowElement.appendChild(timeElement)
  rowElement.appendChild(messageElement)
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

const getHomeySettings = async (homey: Homey): Promise<void> => {
  const homeySettings = await new Promise<HomeySettingsUI>(
    (resolve, reject) => {
      homey.get(async (error: Error | null, settings: HomeySettingsUI) => {
        if (error) {
          await homey.alert(error.message)
          reject(error)
          return
        }
        resolve(settings)
      })
    },
  )
  if (!logsElement.childElementCount) {
    ;(homeySettings.lastLogs ?? [])
      .filter(({ time }) => {
        const date = new Date(time)
        const oldestDate = new Date()
        oldestDate.setDate(oldestDate.getDate() - DAYS_6)
        oldestDate.setHours(NUMBER_0, NUMBER_0, NUMBER_0, NUMBER_0)
        return date >= oldestDate
      })
      .reverse()
      .forEach(displayLog)
  }
  capabilityPathElement.value = homeySettings.capabilityPath ?? ''
  enabledElement.value = String(homeySettings.enabled ?? false)
  enableButtons()
}

const getTemperatureSensors = async (homey: Homey): Promise<void> =>
  new Promise((resolve, reject) => {
    homey.api(
      'GET',
      '/devices/sensors/temperature',
      async (error: Error | null, devices: TemperatureSensor[]) => {
        if (error) {
          await handleTemperatureSensorsError(homey, error.message)
          reject(error)
          return
        }
        devices.forEach(({ capabilityPath, capabilityName }) => {
          const optionElement = document.createElement('option')
          optionElement.value = capabilityPath
          optionElement.innerText = capabilityName
          capabilityPathElement.appendChild(optionElement)
        })
        resolve()
      },
    )
  })

// eslint-disable-next-line func-style
async function onHomeyReady(homey: Homey): Promise<void> {
  await getLanguage(homey)
  document.documentElement.lang = language
  refreshElement.addEventListener('click', () => {
    disableButtons()
    getHomeySettings(homey)
      .catch(async (error: unknown) => {
        await homey.alert(
          error instanceof Error ? error.message : String(error),
        )
      })
      .finally(enableButtons)
  })
  applyElement.addEventListener('click', () => {
    disableButtons()
    homey.api(
      'PUT',
      '/melcloud/cooling/auto_adjustment',
      {
        capabilityPath: capabilityPathElement.value as CapabilityPath,
        isEnabled: enabledElement.value === 'true',
      } satisfies TemperatureListenerData,
      async (error: Error | null) => {
        enableButtons()
        if (error) {
          await homey.alert(error.message)
        }
      },
    )
  })
  homey.on('log', displayLog)
  await getTemperatureSensors(homey)
  await getHomeySettings(homey)
  await homey.ready()
}
