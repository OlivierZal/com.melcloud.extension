import type { TypedManagerSettings } from '@olivierzal/homey-kit/types'
import type HomeyLib from 'homey/lib/Homey.js'

import type MELCloudExtensionApp from './app.mts'
import type { HomeySettings } from './types.mts'

declare module 'homey' {
  interface Homey extends HomeyLib {
    manifest: { version: string }
    settings: ManagerSettings
  }

  // The SDK interfaces are extended, not replaced: the kit generics
  // supply the narrowed member SIGNATURES, the base supplies everything
  // else. Extending both directly conflicts on the members they share.
  interface ManagerSettings extends HomeyLib.ManagerSettings {
    get: TypedManagerSettings<HomeySettings>['get']
    set: TypedManagerSettings<HomeySettings>['set']
    unset: TypedManagerSettings<HomeySettings>['unset']
  }
}

declare module 'homey/lib/Homey.js' {
  interface Homey extends HomeyLib {
    app: MELCloudExtensionApp
  }
}
