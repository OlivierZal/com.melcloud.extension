import type Homey from 'homey/lib/Homey'
import {
  type MeasureTemperatureDevice,
  type OutdoorTemperatureListenerData
} from '../types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onHomeyReady(Homey: Homey): Promise<void> {
  await Homey.ready()

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

  async function getHomeySetting(
    element: HTMLInputElement | HTMLSelectElement,
    defaultValue: any = ''
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      // @ts-expect-error bug
      Homey.get(element.id, async (error: Error, value: any): Promise<void> => {
        if (error !== null) {
          // @ts-expect-error bug
          await Homey.alert(error.message)
          reject(error)
          return
        }
        element.value = String(value ?? defaultValue)
        resolve()
      })
    })
  }

  async function getAutoAdjustmentSettings(): Promise<void> {
    await getHomeySetting(capabilityPathElement)
    await getHomeySetting(enabledElement, false)
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
    const body: OutdoorTemperatureListenerData = {
      capabilityPath,
      enabled
    }
    // @ts-expect-error bug
    Homey.api(
      'POST',
      '/drivers/melcloud/cooling_auto_adjustment',
      body,
      async (error: Error): Promise<void> => {
        applyElement.classList.remove('is-disabled')
        if (error !== null) {
          await getAutoAdjustmentSettings()
          // @ts-expect-error bug
          await Homey.alert(error.message)
          return
        }
        // @ts-expect-error bug
        await Homey.alert(Homey.__('settings.success'))
      }
    )
  })
}
