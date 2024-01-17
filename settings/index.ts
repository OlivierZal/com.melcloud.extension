/* eslint-disable @typescript-eslint/no-unsafe-call */
import type Homey from 'homey/lib/Homey'
import type {
  HomeySettingsUI,
  TemperatureListenerData,
  TemperatureSensor,
  TimestampedLog,
} from '../types'

const SIX_DAYS = 6

async function onHomeyReady(homey: Homey): Promise<void> {
  await homey.ready()

  const categories: Record<string, { color?: string; icon: string }> = {
    error: { icon: '⚠️', color: '#E8000D' },
    retry: { icon: '🔄' },
    /* eslint-disable @typescript-eslint/naming-convention */
    'listener.cleaned': { icon: '🗑️' },
    'listener.cleaned_all': { icon: '🛑' },
    'listener.created': { icon: '🔊' },
    'listener.listened': { icon: '👂', color: '#0047AB' },
    'target_temperature.calculated': { icon: '🔢', color: '#008000' },
    'target_temperature.reverted': { icon: '↩️' },
    'target_temperature.saved': { icon: '☁️' },
    /* eslint-enable @typescript-eslint/naming-convention */
  }

  const language: string = await new Promise<string>((resolve, reject) => {
    // @ts-expect-error: `homey` is partially typed
    homey.api('GET', '/language', (error: Error | null, lang: string): void => {
      if (error) {
        reject(error)
        return
      }
      document.documentElement.lang = lang
      resolve(lang)
    })
  })

  const applyElement: HTMLButtonElement = document.getElementById(
    'apply',
  ) as HTMLButtonElement
  const refreshElement: HTMLButtonElement = document.getElementById(
    'refresh',
  ) as HTMLButtonElement
  const capabilityPathElement: HTMLSelectElement = document.getElementById(
    'capabilityPath',
  ) as HTMLSelectElement
  const enabledElement: HTMLSelectElement = document.getElementById(
    'enabled',
  ) as HTMLSelectElement
  const logsElement: HTMLTableSectionElement = document.getElementById(
    'logs',
  ) as HTMLTableSectionElement

  const displayTime = (time: number): string =>
    new Date(time).toLocaleString(language, {
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
    })

  const displayLog = (log: TimestampedLog): void => {
    const { color, icon } = categories[log.category ?? 'error']

    const rowElement: HTMLDivElement = document.createElement('div')
    rowElement.style.display = 'flex'
    rowElement.style.marginBottom = '1em'

    const timeElement: HTMLDivElement = document.createElement('div')
    timeElement.style.color = '#888'
    timeElement.style.flexShrink = '0'
    timeElement.style.marginRight = '1em'
    timeElement.style.textAlign = 'center'
    timeElement.style.whiteSpace = 'nowrap'
    timeElement.innerHTML = `${displayTime(log.time)}<br>${icon}`

    const messageElement: HTMLDivElement = document.createElement('div')
    if (color !== undefined) {
      messageElement.style.color = color
    }
    messageElement.innerText = log.message
    rowElement.appendChild(timeElement)
    rowElement.appendChild(messageElement)
    logsElement.insertBefore(rowElement, logsElement.firstChild)
  }

  const disableButtons = (value = true): void => {
    ;[applyElement, refreshElement].forEach((element: HTMLButtonElement) => {
      if (value) {
        element.classList.add('is-disabled')
      } else {
        element.classList.remove('is-disabled')
      }
    })
  }

  const enableButtons = (value = true): void => {
    disableButtons(!value)
  }

  const getHomeySettings = async (): Promise<void> => {
    const homeySettings: HomeySettingsUI = await new Promise<HomeySettingsUI>(
      (resolve, reject) => {
        // @ts-expect-error: `homey` is partially typed
        homey.get(
          async (
            error: Error | null,
            settings: HomeySettingsUI,
          ): Promise<void> => {
            if (error) {
              // @ts-expect-error: `homey` is partially typed
              await homey.alert(error.message)
              reject(error)
              return
            }
            resolve(settings)
          },
        )
      },
    )
    if (!logsElement.childElementCount) {
      ;(homeySettings.lastLogs ?? [])
        .filter(({ time }) => {
          const date: Date = new Date(time)
          const oldestDate: Date = new Date()
          oldestDate.setDate(oldestDate.getDate() - SIX_DAYS)
          oldestDate.setHours(0, 0, 0, 0)
          return date >= oldestDate
        })
        .reverse()
        .forEach(displayLog)
    }
    capabilityPathElement.value = homeySettings.capabilityPath ?? ''
    enabledElement.value = String(homeySettings.enabled ?? false)
    enableButtons()
  }

  const handleTemperatureSensorsError = async (
    errorMessage: string,
  ): Promise<void> => {
    if (errorMessage === 'no_device_ata') {
      // @ts-expect-error: `homey` is partially typed
      await homey.confirm(
        homey.__('settings.no_device_ata'),
        null,
        async (error: Error | null, ok: boolean): Promise<void> => {
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
      return
    }
    // @ts-expect-error: `homey` is partially typed
    await homey.alert(errorMessage)
  }

  const getTemperatureSensors = (): void => {
    // @ts-expect-error: `homey` is partially typed
    homey.api(
      'GET',
      '/devices/sensors/temperature',
      async (
        error: Error | null,
        devices: TemperatureSensor[],
      ): Promise<void> => {
        if (error) {
          await handleTemperatureSensorsError(error.message)
          return
        }
        if (!devices.length) {
          // @ts-expect-error: `homey` is partially typed
          await homey.alert(homey.__('settings.no_device_measure'))
          return
        }
        devices.forEach((device: TemperatureSensor) => {
          const { capabilityPath, capabilityName } = device
          const optionElement: HTMLOptionElement =
            document.createElement('option')
          optionElement.value = capabilityPath
          optionElement.innerText = capabilityName
          capabilityPathElement.appendChild(optionElement)
        })
        await getHomeySettings()
      },
    )
  }

  capabilityPathElement.addEventListener('change', (): void => {
    if (capabilityPathElement.value) {
      if (enabledElement.value === 'false') {
        enabledElement.value = 'true'
      }
    } else if (enabledElement.value === 'true') {
      enabledElement.value = 'false'
    }
  })

  refreshElement.addEventListener('click', (): void => {
    disableButtons()
    getHomeySettings()
      .catch(async (error: Error): Promise<void> => {
        // @ts-expect-error: `homey` is partially typed
        await homey.alert(error.message)
      })
      .finally(enableButtons)
  })

  applyElement.addEventListener('click', (): void => {
    disableButtons()
    const enabled: boolean = enabledElement.value === 'true'
    const capabilityPath: string = capabilityPathElement.value
    const body: TemperatureListenerData = { capabilityPath, enabled }
    // @ts-expect-error: `homey` is partially typed
    homey.api(
      'PUT',
      '/melcloud/cooling/auto_adjustment',
      body,
      async (error: Error | null): Promise<void> => {
        enableButtons()
        if (error) {
          // @ts-expect-error: `homey` is partially typed
          await homey.alert(error.message)
        }
      },
    )
  })

  homey.on('log', displayLog)

  getTemperatureSensors()
}
