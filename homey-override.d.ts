import type HomeyLib from 'homey/lib/Homey'

import type MELCloudExtensionApp from './app.mts'
import type { HomeySettings } from './types.mts'

declare module 'homey' {
  interface Homey extends HomeyLib {
    manifest: { version: string }
    settings: ManagerSettings
  }

  interface ManagerSettings extends HomeyLib.ManagerSettings {
    get: <T extends keyof HomeySettings>(key: T) => HomeySettings[T]
    set: <T extends keyof HomeySettings>(
      key: T,
      value: HomeySettings[T],
    ) => void
  }
}

declare module 'homey/lib/Homey' {
  interface Homey extends HomeyLib {
    app: MELCloudExtensionApp
  }
}
