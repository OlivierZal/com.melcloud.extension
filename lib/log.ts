import type { Homey } from 'homey/lib/Device'
import type { LogParams } from '../types'

export default class Log {
  message: string | LogParams

  action?: string

  homey?: Homey

  constructor(message: string | LogParams, action?: string, homey?: Homey) {
    this.homey = homey
    this.message = message
    this.action = action
  }

  // Utilisation du getter pour obtenir le message de log formaté
  toString(): string {
    return this.homey && typeof this.message === 'object'
      ? this.homey
          .__(`log.${this.action}`, this.message)
          .replace(/a el/gi, 'al')
          .replace(/de le/gi, 'du')
      : String(this.message)
  }
}
