import type MELCloudExtensionApp from '../app.mts'
import { getErrorMessage } from '../lib/get-error-message.mts'
import { OutdoorSource } from './outdoor-source.mts'

const WEATHER_PATH = '/api/manager/weather/weather'
// The Homey weather refreshes from Athom's cloud on an hourly-ish cadence
const POLL_INTERVAL = 900_000

const readTemperature = (report: unknown): unknown => {
  if (
    typeof report === 'object' &&
    report !== null &&
    'temperatureCelsius' in report
  ) {
    return report.temperatureCelsius
  }
  return null
}

// Default outdoor feed: the weather Homey displays on its home screen
// (Athom cloud weather at the Homey's location), read from the local
// weather manager and polled while at least one device is cooling.
export class WeatherOutdoorSource extends OutdoorSource {
  public readonly name: string

  #pollInterval: NodeJS.Timeout | null = null

  public constructor(app: MELCloudExtensionApp) {
    super(app)
    this.name = app.names.homeyWeather
  }

  protected async start(): Promise<void> {
    this.initialize(await this.#fetchTemperature())
    this.#pollInterval = this.app.homey.setInterval(async () => {
      await this.update(await this.#fetchTemperature())
    }, POLL_INTERVAL)
    this.app.pushToUI('created', {
      capability: this.app.names.temperature,
      name: this.name,
    })
  }

  protected stop(): void {
    if (this.#pollInterval === null) {
      return
    }
    this.app.homey.clearInterval(this.#pollInterval)
    this.#pollInterval = null
    this.app.pushToUI('cleaned', {
      capability: this.app.names.temperature,
      name: this.name,
    })
  }

  // Routed through the connected homey-api session: the app-side
  // ManagerApi rejects with `Missing Session`, and homey-api ships no
  // weather manager wrapper (absent from its local specification). A
  // failed fetch reads as "no measurement": the targets fall back to
  // the user thresholds until the next poll succeeds.
  async #fetchTemperature(): Promise<unknown> {
    try {
      const report = await this.app.api.call({
        method: 'GET',
        path: WEATHER_PATH,
      })
      return readTemperature(report)
    } catch (error) {
      this.app.error(getErrorMessage(error))
      return null
    }
  }
}
