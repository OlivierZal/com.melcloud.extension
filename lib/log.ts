import type { LogParams } from '../types'

export default class Log {
  messageOrParams: string | LogParams

  event?: string

  constructor(messageOrParams: string | LogParams, event?: string) {
    this.messageOrParams = messageOrParams
    this.event = event
  }
}
