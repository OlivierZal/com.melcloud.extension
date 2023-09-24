/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type Homey from 'homey/lib/Homey'
import Log from '../lib/log'
import type { HomeySettings, TimestampedLog } from '../types'

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
        const action = logType === 'error' ? 'error' : args[0].action
        const message = String(args[0])
        this.pushLogToUI({
          message,
          action,
        })
        super[logType](message, `[#${action}]`)
      } else {
        super[logType](...args)
      }
    }

    pushLogToUI({
      message,
      action,
    }: {
      message: string
      action?: string
    }): void {
      const newLog: TimestampedLog = {
        action,
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
        this.error(new Log(this.homey, error.message))
      })
    }
  }
  Object.defineProperty(LogsDecorator, 'name', {
    value: context.name,
  })
  return LogsDecorator
}
