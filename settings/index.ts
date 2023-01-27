import type Homey from 'homey/lib/Homey'
import { type OutdoorTemperatureListenerForAtaData } from '../types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function onHomeyReady (Homey: Homey): Promise<void> {
  await Homey.ready()

  const minimumTemperature: number = 10
  const maximumTemperature: number = 38

  const applyElement: HTMLButtonElement = document.getElementById(
    'apply'
  ) as HTMLButtonElement
  const refreshElement: HTMLButtonElement = document.getElementById(
    'refresh'
  ) as HTMLButtonElement
  const thresholdElement: HTMLInputElement = document.getElementById(
    'threshold'
  ) as HTMLInputElement
  const capabilityPathElement: HTMLSelectElement = document.getElementById(
    'capabilityPath'
  ) as HTMLSelectElement
  const enabledElement: HTMLSelectElement = document.getElementById(
    'enabled'
  ) as HTMLSelectElement

  function getHomeySetting (
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

  function int (
    element: HTMLInputElement,
    value: number = Number.parseInt(element.value)
  ): number {
    if (
      Number.isNaN(value) ||
      value < Number(element.min) ||
      value > Number(element.max)
    ) {
      element.value = ''
      throw new Error(
        `${element.name} must be an integer between ${element.min} and ${element.max}.`
      )
    }
    return value
  }

  function getHomeySelfAdjustSettings (): void {
    getHomeySetting(capabilityPathElement)
    getHomeySetting(enabledElement, false)
    getHomeySetting(thresholdElement, 22)
  }

  function getMeasureTemperatureCapabilitiesForAta (): void {
    // @ts-expect-error bug
    Homey.api(
      'GET',
      '/drivers/melcloud/available_temperatures',
      async (error: Error, devices: any[]): Promise<void> => {
        if (devices.length === 0) {
          return
        }
        if (error !== null) {
          // @ts-expect-error bug
          await Homey.alert(error.message)
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

  thresholdElement.min = String(minimumTemperature)
  thresholdElement.max = String(maximumTemperature)
  getMeasureTemperatureCapabilitiesForAta()

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

  thresholdElement.addEventListener('change', (): void => {
    if (enabledElement.value === 'false') {
      enabledElement.value = 'true'
    }
  })

  refreshElement.addEventListener('click', (): void => {
    getHomeySelfAdjustSettings()
  })

  applyElement.addEventListener('click', (): void => {
    let threshold: number = 0
    try {
      threshold = int(thresholdElement)
    } catch (error: unknown) {
      getHomeySelfAdjustSettings()
      // @ts-expect-error bug
      Homey.alert(error.message)
      return
    }
    const enabled: boolean = enabledElement.value === 'true'
    const capabilityPath: string = capabilityPathElement.value
    const body: OutdoorTemperatureListenerForAtaData = {
      capabilityPath,
      enabled,
      threshold
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
        await Homey.alert('Settings have been successfully saved.')
      }
    )
  })
}
