import type Homey from 'homey/lib/Homey'
import type {
  Log,
  MeasureTemperatureDevice,
  TemperatureListenerData,
  Settings,
} from '../types'

async function onHomeyReady(homey: Homey): Promise<void> {
  await homey.ready()

  const actions: Record<string, { color?: string; icon: string }> = {
    error: { icon: '⚠️', color: '#E8000D' },
    'listener.cleaned': { icon: '🧽' },
    'listener.cleaned_all': { icon: '💥' },
    'listener.created': { icon: '📝' },
    'listener.listened': { icon: '👂', color: '#0047AB' },
    retry: { icon: '🔄' },
    'target_temperature.calculated': { icon: '🧮', color: '#008000' },
    'target_temperature.reverted': { icon: '🔙' },
    'target_temperature.saved': { icon: '💾' },
  }

  await new Promise<string>((resolve, reject) => {
    // @ts-expect-error bug
    homey.api(
      'GET',
      '/language',
      (error: Error | null, language: string): void => {
        if (error !== null) {
          reject(error)
          return
        }
        document.documentElement.lang = language
        resolve(language)
      }
    )
  })

  const applyElement: HTMLButtonElement = document.getElementById(
    'apply'
  ) as HTMLButtonElement
  const refreshElement: HTMLButtonElement = document.getElementById(
    'refresh'
  ) as HTMLButtonElement
  const capabilityPathElement: HTMLSelectElement = document.getElementById(
    'capabilityPath'
  ) as HTMLSelectElement
  const enabledElement: HTMLSelectElement = document.getElementById(
    'enabled'
  ) as HTMLSelectElement
  const logsElement: HTMLTableSectionElement = document.getElementById(
    'logs'
  ) as HTMLTableSectionElement

  function addLog(log: Log): void {
    const rowElement: HTMLDivElement = document.createElement('div')
    logsElement.insertBefore(rowElement, logsElement.firstChild)
    rowElement.style.display = 'flex'
    rowElement.style.marginBottom = '1em'

    const timeElement: HTMLDivElement = document.createElement('div')
    timeElement.style.color = '#888'
    timeElement.style.flexShrink = '0'
    timeElement.style.marginRight = '1em'
    timeElement.style.textAlign = 'center'
    timeElement.style.whiteSpace = 'nowrap'
    timeElement.innerHTML = `${log.time}<br>${actions[log.action].icon}`
    rowElement.appendChild(timeElement)

    const messageElement: HTMLDivElement = document.createElement('div')
    const { color } = actions[log.action]
    if (color !== undefined) {
      messageElement.style.color = color
    }
    messageElement.innerText = log.message
      .replace(/ :/g, '\u00A0:')
      .replace(/ °/g, '\u00A0°')
    rowElement.appendChild(messageElement)
  }

  async function gethomeySettings(): Promise<void> {
    const homeySettings: Settings = await new Promise<Settings>(
      (resolve, reject) => {
        // @ts-expect-error bug
        homey.get(
          async (error: Error | null, settings: Settings): Promise<void> => {
            if (error !== null) {
              // @ts-expect-error bug
              await homey.alert(error.message)
              reject(error)
              return
            }
            resolve(settings)
          }
        )
      }
    )
    if (logsElement.childElementCount === 0) {
      ;((homeySettings.lastLogs as Log[] | undefined) ?? [])
        .reverse()
        .forEach((log: Log): void => {
          addLog(log)
        })
    }
    capabilityPathElement.value =
      (homeySettings[capabilityPathElement.id] as string | undefined) ?? ''
    enabledElement.value = String(
      (homeySettings[enabledElement.id] as boolean | undefined) ?? false
    )
    refreshElement.classList.remove('is-disabled')
  }

  async function handleGetMeasureTemperatureDevicesError(
    errorMessage: string
  ): Promise<void> {
    if (errorMessage === 'no_device_ata') {
      // @ts-expect-error bug
      await homey.confirm(
        homey.__('settings.no_device_ata'),
        null,
        async (error: Error | null, ok: boolean): Promise<void> => {
          if (error !== null) {
            // @ts-expect-error bug
            await homey.alert(error.message)
          }
          if (ok) {
            // @ts-expect-error bug
            await homey.openURL('https://homey.app/a/com.mecloud')
          }
        }
      )
      return
    }
    // @ts-expect-error bug
    await homey.alert(errorMessage)
  }

  function getMeasureTemperatureDevices(): void {
    // @ts-expect-error bug
    homey.api(
      'GET',
      '/drivers/melcloud/available_temperatures',
      async (
        error: Error | null,
        devices: MeasureTemperatureDevice[]
      ): Promise<void> => {
        if (error !== null) {
          await handleGetMeasureTemperatureDevicesError(error.message)
          return
        }
        if (devices.length === 0) {
          // @ts-expect-error bug
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
        await gethomeySettings()
      }
    )
  }

  getMeasureTemperatureDevices()

  capabilityPathElement.addEventListener('change', (): void => {
    if (capabilityPathElement.value !== '') {
      if (enabledElement.value === 'false') {
        enabledElement.value = 'true'
      }
    } else if (enabledElement.value === 'true') {
      enabledElement.value = 'false'
    }
  })

  refreshElement.addEventListener('click', (): void => {
    refreshElement.classList.add('is-disabled')
    gethomeySettings().catch(async (error: Error): Promise<void> => {
      // @ts-expect-error bug
      await homey.alert(error.message)
    })
  })

  applyElement.addEventListener('click', (): void => {
    applyElement.classList.add('is-disabled')
    const enabled: boolean = enabledElement.value === 'true'
    const capabilityPath: string = capabilityPathElement.value
    const body: TemperatureListenerData = {
      capabilityPath,
      enabled,
    }
    // @ts-expect-error bug
    homey.api(
      'POST',
      '/drivers/melcloud/cooling_auto_adjustment',
      body,
      async (error: Error | null): Promise<void> => {
        applyElement.classList.remove('is-disabled')
        if (error !== null) {
          // @ts-expect-error bug
          await homey.alert(error.message)
        }
      }
    )
  })

  homey.on('log', (log: Log): void => {
    addLog(log)
  })
}
