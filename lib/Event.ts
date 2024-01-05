import type Homey from 'homey/lib/Homey'
import type { EventParams, HomeySettings, TimestampedLog } from '../types'

const MAX_LOGS = 100

export default class Event {
  readonly #name: string

  readonly #message: string

  readonly #homey: Homey

  public constructor(
    homey: Homey,
    eventName: string,
    eventParams?: EventParams,
  ) {
    this.#homey = homey
    this.#name = eventName
    this.#message = homey.__(`log.${eventName}`, eventParams)
    this.pushEventToUI()
  }

  private pushEventToUI(): void {
    const newLog: TimestampedLog = {
      category: this.#name.startsWith('error.') ? 'error' : this.#name,
      message: this.#message,
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
