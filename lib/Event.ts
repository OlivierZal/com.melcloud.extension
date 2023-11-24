import type Homey from 'homey/lib/Homey'
import type { EventParams, HomeySettings, TimestampedLog } from '../types'

const maxLogs = 100

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
    this.message = homey.__(`log.${eventName}`, eventParams)
    this.name = eventName
  }

  public toString(): string {
    return `[#${this.name}] ${this.message}`
  }

  public pushEventToUI(error = false): void {
    const newLog: TimestampedLog = {
      category: error ? 'error' : this.name,
      message: this.message,
      time: Date.now(),
    }
    const lastLogs: TimestampedLog[] =
      (this.#homey.settings.get('lastLogs') as HomeySettings['lastLogs']) ?? []
    lastLogs.unshift(newLog)
    if (lastLogs.length > maxLogs) {
      lastLogs.length = maxLogs
    }
    this.#homey.settings.set('lastLogs', lastLogs)
    this.#homey.api.realtime('log', newLog)
  }
}
