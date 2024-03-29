/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  HomeySettingsUI,
  TemperatureListenerData,
  TemperatureSensor,
  TimestampedLog,
} from '../types'
import type Homey from 'homey/lib/Homey'

const CATEGORIES: Record<string, { color?: string; icon: string }> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  error: { color: '#E8000D', icon: '⚠️' },
  'listener.cleaned': { icon: '🗑️' },
  'listener.cleaned_all': { icon: '🛑' },
  'listener.created': { icon: '🔊' },
  'listener.listened': { color: '#0047AB', icon: '👂' },
  retry: { icon: '🔄' },
  'target_temperature.calculated': { color: '#008000', icon: '🔢' },
  'target_temperature.reverted': { icon: '↩️' },
  'target_temperature.saved': { icon: '☁️' },
  /* eslint-enable @typescript-eslint/naming-convention */
}
const DAYS_6 = 6
const HOURS_0 = 0
const MINUTES_0 = 0
const SECONDS_0 = 0
const MILLISECONDS_0 = 0

let language = ''

const getLanguage = async (homey: Homey): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    // @ts-expect-error: `homey` is partially typed
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

const displayLog = (log: TimestampedLog): void => {
  const { color, icon } = CATEGORIES[log.category ?? 'error']
  const timeElement = createTimeElement(log.time, icon)
  const messageElement = createMessageElement(log.message, color)
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
    // @ts-expect-error: `homey` is partially typed
    await homey.alert(errorMessage)
    return
  }
  // @ts-expect-error: `homey` is partially typed
  await homey.confirm(
    homey.__('settings.no_device_ata'),
    null,
    async (error: Error | null, ok: boolean) => {
      if (error) {
        // @ts-expect-error: `homey` is partially typed
        await homey.alert(error.message)
      }
      if (ok) {
        // @ts-expect-error: `homey` is partially typed
        await homey.openURL('https://homey.app/a/com.mecloud')
      }
    },
  )
}

const getHomeySettings = async (homey: Homey): Promise<void> => {
  const homeySettings = await new Promise<HomeySettingsUI>(
    (resolve, reject) => {
      // @ts-expect-error: `homey` is partially typed
      homey.get(async (error: Error | null, settings: HomeySettingsUI) => {
        if (error) {
          // @ts-expect-error: `homey` is partially typed
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
        oldestDate.setHours(HOURS_0, MINUTES_0, SECONDS_0, MILLISECONDS_0)
        return date >= oldestDate
      })
      .reverse()
      .forEach(displayLog)
  }
  capabilityPathElement.value = homeySettings.capabilityPath ?? ''
  enabledElement.value = String(homeySettings.enabled ?? false)
  enableButtons()
}

const getTemperatureSensors = (homey: Homey): void => {
  // @ts-expect-error: `homey` is partially typed
  homey.api(
    'GET',
    '/devices/sensors/temperature',
    async (error: Error | null, devices: TemperatureSensor[]) => {
      if (error) {
        await handleTemperatureSensorsError(homey, error.message)
        return
      }
      devices.forEach((device) => {
        const { capabilityPath, capabilityName } = device
        const optionElement = document.createElement('option')
        optionElement.value = capabilityPath
        optionElement.innerText = capabilityName
        capabilityPathElement.appendChild(optionElement)
      })
      await getHomeySettings(homey)
    },
  )
}

// eslint-disable-next-line func-style
async function onHomeyReady(homey: Homey): Promise<void> {
  await homey.ready()
  await getLanguage(homey)

  document.documentElement.lang = language

  refreshElement.addEventListener('click', () => {
    disableButtons()
    getHomeySettings(homey)
      .catch(async (error: unknown) => {
        // @ts-expect-error: `homey` is partially typed
        await homey.alert(
          error instanceof Error ? error.message : String(error),
        )
      })
      .finally(enableButtons)
  })

  applyElement.addEventListener('click', () => {
    disableButtons()
    const enabled = enabledElement.value === 'true'
    const capabilityPath = capabilityPathElement.value as `${string}:${string}`
    const body: TemperatureListenerData = { capabilityPath, enabled }
    // @ts-expect-error: `homey` is partially typed
    homey.api(
      'PUT',
      '/melcloud/cooling/auto_adjustment',
      body,
      async (error: Error | null) => {
        enableButtons()
        if (error) {
          // @ts-expect-error: `homey` is partially typed
          await homey.alert(error.message)
        }
      },
    )
  })

  homey.on('log', displayLog)

  getTemperatureSensors(homey)
}
