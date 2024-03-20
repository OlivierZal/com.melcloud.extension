import type { ListenerEventParams, TimestampedLog } from '../types'
import type Homey from 'homey/lib/Homey'
import type MELCloudExtensionApp from '../app'

const MAX_LOGS = 100

export default class ListenerEvent {
  readonly #app: MELCloudExtensionApp

  readonly #homey: Homey

  readonly #message: string

  readonly #name: string

  public constructor(
    homey: Homey,
    listenerEventName: string,
    listenerEventParams?: ListenerEventParams,
  ) {
    this.#homey = homey
    this.#app = homey.app as MELCloudExtensionApp
    this.#name = listenerEventName
    this.#message = homey.__(`log.${listenerEventName}`, listenerEventParams)
  }

  public pushToUI(): void {
    const newLog: TimestampedLog = {
      category: this.#name.startsWith('error.') ? 'error' : this.#name,
      message: this.#message,
      time: Date.now(),
    }
    this.#homey.api.realtime('log', newLog)
    const lastLogs: TimestampedLog[] =
      this.#app.getHomeySetting('lastLogs') ?? []
    lastLogs.unshift(newLog)
    if (lastLogs.length > MAX_LOGS) {
      lastLogs.length = MAX_LOGS
    }
    this.#app.setHomeySettings({ lastLogs })
  }
}
