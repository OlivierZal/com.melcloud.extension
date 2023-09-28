import type { EventParams } from '../types'

export default class Event {
  messageOrParams: string | EventParams

  name?: string

  constructor(messageOrParams: string | EventParams, name?: string) {
    this.messageOrParams = messageOrParams
    this.name = name
  }
}
