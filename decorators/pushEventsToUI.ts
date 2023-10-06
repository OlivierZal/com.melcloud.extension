/* eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-argument
*/
import Event from '../lib/Event'
import type {
  EventParams,
  HomeyClass,
  HomeySettings,
  TimestampedLog,
} from '../types'

const maxLogs = 100

export default function pushEventsToUI<T extends HomeyClass>(
  target: T,
  context: ClassDecoratorContext<T>,
): T {
  class LogDecorator extends target {
    public error(...args: any[]): void {
      this.commonLog('error', ...args)
    }

    public log(...args: any[]): void {
      this.commonLog('log', ...args)
    }

    private commonLog(logType: 'error' | 'log', ...args: any[]): void {
      if (args.length === 1 && args[0] instanceof Event) {
        let { messageOrParams } = args[0]
        const { name } = args[0]
        if (typeof messageOrParams === 'object' && name !== undefined) {
          messageOrParams = this.getMessage(name, messageOrParams)
        }
        this.pushEventToUI(
          String(messageOrParams),
          logType === 'error' ? 'error' : name,
        )
        super[logType](`[#${name}]`, messageOrParams)
      } else {
        super[logType](...args)
      }
    }

    private getMessage(eventName: string, eventParams: EventParams): string {
      return this.homey
        .__(`log.${eventName}`, eventParams)
        .replace(/a el/gi, 'al')
        .replace(/de le/gi, 'du')
    }

    private pushEventToUI(message: string, category?: string): void {
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
  }

  Object.defineProperty(LogDecorator, 'name', {
    value: context.name,
  })

  return LogDecorator
}
