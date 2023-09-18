import type { HomeySettingValue, Log, LogParams, TimestampedLog } from './types'

interface HomeyClass {
  homey: {
    api: {
      realtime(event: 'log', data: TimestampedLog): void
    }
    settings: {
      get(key: string): HomeySettingValue
      set(key: string, value: HomeySettingValue): void
    }
  }
}

const maxLogs = 100

export default function pushToUI<T extends HomeyClass>(
  originalMethod: (params: LogParams, action: string) => Log,
  _context: unknown, // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  function replacementMethod(this: T, params: LogParams, action: string) {
    const result = originalMethod.call(this, params, action)
    const newLog: TimestampedLog = {
      ...result,
      time: Date.now(),
    }
    const lastLogs: Log[] =
      (this.homey.settings.get('lastLogs') as Log[] | null) ?? []
    lastLogs.unshift(newLog)
    if (lastLogs.length > maxLogs) {
      lastLogs.length = maxLogs
    }
    this.homey.settings.set('lastLogs', lastLogs)
    this.homey.api.realtime('log', newLog)
    return result
  }
  return replacementMethod
}
