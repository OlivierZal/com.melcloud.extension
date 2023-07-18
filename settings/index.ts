import type Homey from 'homey/lib/Homey'
import {
  type Log,
  type MeasureTemperatureDevice,
  type TemperatureListenerData,
} from '../types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onHomeyReady(Homey: Homey): Promise<void> {
  await Homey.ready()

  const actions: Record<string, { color?: string; icon: string }> = {
    error: { icon: '⚠️ ', color: '#E8000D' },
    'listener.cleaned': { icon: '🧽 ' },
    'listener.cleaned_all': { icon: '💥 ' },
    'listener.created': { icon: '📝 ' },
    'listener.listened': { icon: '👂 ', color: '#0047AB' },
    retry: { icon: '🔄 ' },
    'target_temperature.calculated': { icon: '🧮 ', color: '#008000' },
    'target_temperature.reverted': { icon: '🔙 ' },
    'target_temperature.saved': { icon: '💾 ' },
  }

  await new Promise<string>((resolve, reject) => {
    // @ts-expect-error bug
    Homey.api(
      'GET',
      '/language',
      async (error: Error, language: string): Promise<void> => {
        if (error !== null) {
          reject(error)
          return
        }
        document.documentElement.lang = language
        resolve(language)
      }
    )
  })

  async function getHomeySettings(): Promise<Record<string, any>> {
    return await new Promise<Record<string, any>>((resolve, reject) => {
      // @ts-expect-error bug
      Homey.get(
        async (error: Error, settings: Record<string, any>): Promise<void> => {
          if (error !== null) {
            // @ts-expect-error bug
            await Homey.alert(error.message)
            reject(error)
            return
          }
          resolve(settings)
        }
      )
    })
  }

  const homeySettings: Record<string, any> = await getHomeySettings()

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

  async function getAutoAdjustmentSettings(): Promise<void> {
    capabilityPathElement.value = homeySettings[capabilityPathElement.id] ?? ''
    enabledElement.value = String(homeySettings[enabledElement.id] ?? false)
    refreshElement.classList.remove('is-disabled')
  }

  async function handleGetMeasureTemperatureDevicesError(
    error: Error
  ): Promise<void> {
    if (error.message === 'no_device_ata') {
      // @ts-expect-error bug
      await Homey.confirm(
        Homey.__('settings.no_device_ata'),
        null,
        async (error: Error, ok: boolean): Promise<void> => {
          if (error !== null) {
            // @ts-expect-error bug
            await Homey.alert(error.message)
          }
          if (ok) {
            // @ts-expect-error bug
            await Homey.openURL('https://homey.app/a/com.mecloud')
          }
        }
      )
      return
    }
    // @ts-expect-error bug
    await Homey.alert(error.message)
  }

  async function getMeasureTemperatureDevices(): Promise<void> {
    // @ts-expect-error bug
    Homey.api(
      'GET',
      '/drivers/melcloud/available_temperatures',
      async (
        error: Error,
        devices: MeasureTemperatureDevice[]
      ): Promise<void> => {
        if (error !== null) {
          await handleGetMeasureTemperatureDevicesError(error)
          return
        }
        if (devices.length === 0) {
          // @ts-expect-error bug
          await Homey.alert(Homey.__('settings.no_device_measure'))
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
        await getAutoAdjustmentSettings()
      }
    )
  }

  await getMeasureTemperatureDevices()

  capabilityPathElement.addEventListener('change', (): void => {
    if (capabilityPathElement.value !== '') {
      if (enabledElement.value === 'false') {
        enabledElement.value = 'true'
      }
    } else if (
      capabilityPathElement.value === '' &&
      enabledElement.value === 'true'
    ) {
      enabledElement.value = 'false'
    }
  })

  refreshElement.addEventListener('click', (): void => {
    refreshElement.classList.add('is-disabled')
    void getAutoAdjustmentSettings()
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
    Homey.api(
      'POST',
      '/drivers/melcloud/cooling_auto_adjustment',
      body,
      async (error: Error): Promise<void> => {
        applyElement.classList.remove('is-disabled')
        if (error !== null) {
          // @ts-expect-error bug
          await Homey.alert(error.message)
        }
      }
    )
  })

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
    timeElement.innerHTML = `${log.time}<br>${actions[log.action]?.icon ?? ''}`
    rowElement.appendChild(timeElement)

    const messageElement: HTMLDivElement = document.createElement('div')
    const color: string | undefined = actions[log.action]?.color
    if (color !== undefined) {
      messageElement.style.color = color
    }
    messageElement.innerText = log.message
      .replace(/ :/g, '\u00A0:')
      .replace(/ °/g, '\u00A0°')
    rowElement.appendChild(messageElement)
  }

  homeySettings.lastLogs.reverse().forEach((log: Log): void => {
    addLog(log)
  })

  Homey.on('log', (log: Log): void => {
    addLog(log)
  })
}
