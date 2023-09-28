import type { EventParams } from '../types'

export default class Event {
  readonly messageOrParams: string | EventParams

  readonly name?: string

  constructor(eventMessageOrParams: string | EventParams, eventName?: string) {
    this.messageOrParams = eventMessageOrParams
    this.name = eventName
  }
}
