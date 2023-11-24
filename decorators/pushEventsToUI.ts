/* eslint-disable
  @typescript-eslint/no-explicit-any,
  @typescript-eslint/no-unsafe-argument
*/
import Event from '../lib/Event'
import type { LogClass } from '../types'

export default function pushEventsToUI<T extends LogClass>(
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
        args[0].pushEventToUI(logType === 'error')
      }
      super[logType](...args.map((arg) => String(arg)))
    }
  }

  Object.defineProperty(LogDecorator, 'name', {
    value: context.name,
  })

  return LogDecorator
}
