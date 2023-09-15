/* eslint-disable @typescript-eslint/no-unsafe-call */
import type Homey from 'homey/lib/Homey'
import type {
  HomeySettings,
  MeasureTemperatureDevice,
  TemperatureListenerData,
  TimestampedLog,
} from '../types'

async function onHomeyReady(homey: Homey): Promise<void> {
  await homey.ready()

  const actions: Record<string, { color?: string; icon: string }> = {
    error: { icon: '⚠️', color: '#E8000D' },
    'listener.cleaned': { icon: '🗑️' },
    'listener.cleaned_all': { icon: '🛑' },
    'listener.created': { icon: '🔊' },
    'listener.listened': { icon: '👂', color: '#0047AB' },
    retry: { icon: '🔄' },
    'target_temperature.calculated': { icon: '🔢', color: '#008000' },
    'target_temperature.reverted': { icon: '↩️' },
    'target_temperature.saved': { icon: '☁️' },
  }

  const language: string = await new Promise<string>((resolve, reject) => {
    // @ts-expect-error: homey is partially typed
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

  function displayTime(time: number): string {
    return new Date(time).toLocaleString(language, {
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
    })
  }

  function displayLog(log: TimestampedLog): void {
    const rowElement: HTMLDivElement = document.createElement('div')
    rowElement.style.display = 'flex'
    rowElement.style.marginBottom = '1em'

    const timeElement: HTMLDivElement = document.createElement('div')
    timeElement.style.color = '#888'
    timeElement.style.flexShrink = '0'
    timeElement.style.marginRight = '1em'
    timeElement.style.textAlign = 'center'
    timeElement.style.whiteSpace = 'nowrap'
    timeElement.innerHTML = `${displayTime(log.time)}<br>${
      actions[log.action].icon
    }`

    const messageElement: HTMLDivElement = document.createElement('div')
    const { color } = actions[log.action]
    if (color) {
      messageElement.style.color = color
    }
    messageElement.innerText = log.message
    rowElement.appendChild(timeElement)
    rowElement.appendChild(messageElement)
    logsElement.insertBefore(rowElement, logsElement.firstChild)
  }

  function disableButtons(value = true): void {
    ;[applyElement, refreshElement].forEach(
      (element: HTMLButtonElement): void => {
        if (value) {
          element.classList.add('is-disabled')
        } else {
          element.classList.remove('is-disabled')
        }
      },
    )
  }

  function enableButtons(value = true): void {
    disableButtons(!value)
  }

  async function getHomeySettings(): Promise<void> {
    const homeySettings: Partial<HomeySettings> = await new Promise<
      Partial<HomeySettings>
    >((resolve, reject) => {
      // @ts-expect-error: homey is partially typed
      homey.get(
        async (
          error: Error | null,
          settings: Partial<HomeySettings>,
        ): Promise<void> => {
          if (error) {
            // @ts-expect-error: homey is partially typed
            await homey.alert(error.message)
            reject(error)
            return
          }
          resolve(settings)
        },
      )
    })
    if (!logsElement.childElementCount) {
      ;((homeySettings.lastLogs as TimestampedLog[] | undefined) ?? [])
        .filter(({ time }): boolean => {
          const date: Date = new Date(time)
          const oldestDate: Date = new Date()
          oldestDate.setDate(oldestDate.getDate() - 6)
          oldestDate.setHours(0, 0, 0, 0)
          return date >= oldestDate
        })
        .reverse()
        .forEach(displayLog)
    }
    capabilityPathElement.value =
      (homeySettings.capabilityPath as string | undefined) ?? ''
    enabledElement.value = String(
      (homeySettings.enabled as boolean | undefined) ?? false,
    )
    enableButtons()
  }

  async function handleGetMeasureTemperatureDevicesError(
    errorMessage: string,
  ): Promise<void> {
    if (errorMessage === 'no_device_ata') {
      // @ts-expect-error: homey is partially typed
      await homey.confirm(
        homey.__('settings.no_device_ata'),
        null,
        async (error: Error | null, ok: boolean): Promise<void> => {
          if (error) {
            // @ts-expect-error: homey is partially typed
            await homey.alert(error.message)
          }
          if (ok) {
            // @ts-expect-error: homey is partially typed
            await homey.openURL('https://homey.app/a/com.mecloud')
          }
        },
      )
      return
    }
    // @ts-expect-error: homey is partially typed
    await homey.alert(errorMessage)
  }

  function getMeasureTemperatureDevices(): void {
    // @ts-expect-error: homey is partially typed
    homey.api(
      'GET',
      '/drivers/melcloud/available_temperatures',
      async (
        error: Error | null,
        devices: MeasureTemperatureDevice[],
      ): Promise<void> => {
        if (error) {
          await handleGetMeasureTemperatureDevicesError(error.message)
          return
        }
        if (!devices.length) {
          // @ts-expect-error: homey is partially typed
          await homey.alert(homey.__('settings.no_device_measure'))
          return
        }
        devices.forEach((device: MeasureTemperatureDevice): void => {
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
        // @ts-expect-error: homey is partially typed
        await homey.alert(error.message)
      })
      .finally(enableButtons)
  })

  applyElement.addEventListener('click', (): void => {
    disableButtons()
    const enabled: boolean = enabledElement.value === 'true'
    const capabilityPath: string = capabilityPathElement.value
    const body: TemperatureListenerData = {
      capabilityPath,
      enabled,
    }
    // @ts-expect-error: homey is partially typed
    homey.api(
      'POST',
      '/drivers/melcloud/cooling_auto_adjustment',
      body,
      async (error: Error | null): Promise<void> => {
        enableButtons()
        if (error) {
          // @ts-expect-error: homey is partially typed
          await homey.alert(error.message)
        }
      },
    )
  })

  homey.on('log', displayLog)

  getMeasureTemperatureDevices()
}
