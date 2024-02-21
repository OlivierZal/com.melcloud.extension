import type { EventParams, HomeySettings, TimestampedLog } from '../types'
import type Homey from 'homey/lib/Homey'

const MAX_LOGS = 100

export default class Event {
  public readonly message: string

  public readonly name: string

  readonly #homey: Homey

  public constructor(
    homey: Homey,
    eventName: string,
    eventParams?: EventParams,
  ) {
    this.#homey = homey
    this.name = eventName
    this.message = homey.__(`log.${eventName}`, eventParams)
    this.#pushEventToUI()
  }

  #pushEventToUI(): void {
    const newLog: TimestampedLog = {
      category: this.name.startsWith('error.') ? 'error' : this.name,
      message: this.message,
      time: Date.now(),
    }
    const lastLogs: TimestampedLog[] =
      (this.#homey.settings.get('lastLogs') as HomeySettings['lastLogs']) ?? []
    lastLogs.unshift(newLog)
    if (lastLogs.length > MAX_LOGS) {
      lastLogs.length = MAX_LOGS
    }
    this.#homey.settings.set('lastLogs', lastLogs)
    this.#homey.api.realtime('log', newLog)
  }
}
