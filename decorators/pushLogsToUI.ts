/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type Homey from 'homey/lib/Homey'
import Event from '../lib/Event'
import type { EventParams, HomeySettings, TimestampedLog } from '../types'

type LogClass = new (...args: any[]) => {
  error(...errorArgs: any[]): void
  log(...logArgs: any[]): void
  homey: Homey
}

const maxLogs = 100

export default function pushLogsToUI<T extends LogClass>(
  Base: T,
  context: ClassDecoratorContext,
) {
  class LogDecorator extends Base {
    error(...args: any[]): void {
      this.commonLog('error', ...args)
    }

    log(...args: any[]): void {
      this.commonLog('log', ...args)
    }

    commonLog(logType: 'error' | 'log', ...args: any[]): void {
      if (args.length === 1 && args[0] instanceof Event) {
        let { messageOrParams } = args[0]
        const { name } = args[0]
        if (typeof messageOrParams === 'object' && name) {
          messageOrParams = this.getMessage(messageOrParams, name)
        }
        this.pushLogToUI(
          String(messageOrParams),
          logType === 'error' ? 'error' : name,
        )
        super[logType](`[#${name}]`, '\t', messageOrParams)
      } else {
        super[logType](...args)
      }
    }

    pushLogToUI(message: string, category?: string): void {
      const newLog: TimestampedLog = {
        category,
        message,
        time: Date.now(),
      }
      const lastLogs: TimestampedLog[] =
        (this.homey.settings.get('lastLogs') as HomeySettings['lastLogs']) ?? []
      lastLogs.unshift(newLog)
      if (lastLogs.length > maxLogs) {
        lastLogs.length = maxLogs
      }
      this.homey.settings.set('lastLogs', lastLogs)
      /* eslint-disable-next-line
        @typescript-eslint/no-unsafe-call,
        @typescript-eslint/no-unsafe-member-access
      */
      this.homey.api.realtime('log', newLog).catch((error: Error) => {
        this.error(new Event(error.message))
      })
    }

    getMessage(params: EventParams, event: string): string {
      return this.homey
        .__(`log.${event}`, params)
        .replace(/a el/gi, 'al')
        .replace(/de le/gi, 'du')
    }
  }
  Object.defineProperty(LogDecorator, 'name', {
    value: context.name,
  })
  return LogDecorator
}
