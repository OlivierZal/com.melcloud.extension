import type { EventParams } from '../types'

export default class Event {
  public readonly messageOrParams: EventParams | string

  public readonly name?: string

  public constructor(
    eventMessageOrParams: EventParams | string,
    eventName?: string,
  ) {
    this.messageOrParams = eventMessageOrParams
    this.name = eventName
  }
}
