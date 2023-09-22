/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { Log, TimestampedLog } from '../types'

type LogClass = new (...args: any[]) => {
  error(...errorArgs: any[]): void
  log(...logArgs: any[]): void
  homey: {
    api: {
      realtime(event: 'log', data: TimestampedLog): Promise<void>
    }
    settings: {
      get(key: 'lastLogs'): Log[] | null
      set(key: 'lastLogs', value: Log[]): void
    }
  }
}

const maxLogs = 100

export default function pushLogsToUI<T extends LogClass>(
  BaseClass: T,
  _context: ClassDecoratorContext, // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  return class MELCloudExtensionApp extends BaseClass {
    error(...args: any[]): void {
      this.commonLog('error', ...args)
    }

    log(...args: any[]): void {
      this.commonLog('log', ...args)
    }

    commonLog(logType: 'error' | 'log', ...args: any[]): void {
      const newArgs: string[] = args.map(String)
      const lastArg: string | undefined = newArgs[newArgs.length - 1] as
        | string
        | undefined
      const action: string | undefined = lastArg?.startsWith('#')
        ? newArgs.pop()?.slice(1)
        : undefined
      super[logType](...args)
      this.pushLogToUI({ message: newArgs.join(' - '), action })
    }

    pushLogToUI({
      message,
      action,
    }: {
      message: string
      action?: string
    }): void {
      const newLog: TimestampedLog = {
        message,
        action,
        time: Date.now(),
      }
      const lastLogs: Log[] = this.homey.settings.get('lastLogs') ?? []
      lastLogs.unshift(newLog)
      if (lastLogs.length > maxLogs) {
        lastLogs.length = maxLogs
      }
      this.homey.settings.set('lastLogs', lastLogs)
      this.homey.api.realtime('log', newLog).catch((error: Error) => {
        this.error(error.message)
      })
    }
  }
}
