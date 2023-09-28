/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type Homey from 'homey/lib/Homey'
import Log from '../lib/Log'
import type { HomeySettings, LogParams, TimestampedLog } from '../types'

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
  class LogsDecorator extends Base {
    error(...args: any[]): void {
      this.commonLog('error', ...args)
    }

    log(...args: any[]): void {
      this.commonLog('log', ...args)
    }

    commonLog(logType: 'error' | 'log', ...args: any[]): void {
      if (args.length === 1 && args[0] instanceof Log) {
        let { messageOrParams } = args[0]
        const { event } = args[0]
        if (typeof messageOrParams === 'object' && event) {
          messageOrParams = this.getMessage(messageOrParams, event)
        }
        this.pushLogToUI(
          String(messageOrParams),
          logType === 'error' ? 'error' : event,
        )
        super[logType](`[#${event}]`, '\t', messageOrParams)
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
        this.error(new Log(error.message))
      })
    }

    getMessage(params: LogParams, event: string): string {
      return this.homey
        .__(`log.${event}`, params)
        .replace(/a el/gi, 'al')
        .replace(/de le/gi, 'du')
    }
  }
  Object.defineProperty(LogsDecorator, 'name', {
    value: context.name,
  })
  return LogsDecorator
}
