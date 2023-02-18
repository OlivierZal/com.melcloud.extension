import type Homey from 'homey/lib/Homey'
import {
  type MeasureTemperatureDevice,
  type OutdoorTemperatureListenerData
} from '../types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onHomeyReady(Homey: Homey): Promise<void> {
  await Homey.ready()

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

  function getHomeySetting(
    element: HTMLInputElement | HTMLSelectElement,
    defaultValue: any = ''
  ): void {
    // @ts-expect-error bug
    Homey.get(element.id, async (error: Error, value: any): Promise<void> => {
      if (error !== null) {
        // @ts-expect-error bug
        await Homey.alert(error.message)
        return
      }
      element.value = String(value ?? defaultValue)
    })
  }

  function getHomeySelfAdjustSettings(): void {
    getHomeySetting(capabilityPathElement)
    getHomeySetting(enabledElement, false)
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
            await Homey.openURL(Homey.__('settings.melcloud_app'))
          }
        }
      )
      return
    }
    // @ts-expect-error bug
    await Homey.alert(error.message)
  }

  function getMeasureTemperatureDevices(): void {
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
        for (const device of devices) {
          const { capabilityPath, capabilityName } = device
          const option: HTMLOptionElement = document.createElement('option')
          option.setAttribute('value', capabilityPath)
          const optionText: Text = document.createTextNode(capabilityName)
          option.appendChild(optionText)
          capabilityPathElement.appendChild(option)
        }
        getHomeySelfAdjustSettings()
      }
    )
  }

  getMeasureTemperatureDevices()

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
    getHomeySelfAdjustSettings()
  })

  applyElement.addEventListener('click', (): void => {
    const enabled: boolean = enabledElement.value === 'true'
    const capabilityPath: string = capabilityPathElement.value
    const body: OutdoorTemperatureListenerData = {
      capabilityPath,
      enabled
    }
    // @ts-expect-error bug
    Homey.api(
      'POST',
      '/drivers/melcloud/cooling_self_adjustment',
      body,
      async (error: Error): Promise<void> => {
        getHomeySelfAdjustSettings()
        if (error !== null) {
          // @ts-expect-error bug
          await Homey.alert(error.message)
          return
        }
        // @ts-expect-error bug
        await Homey.alert(Homey.__('settings.save_success'))
      }
    )
  })
}
