import type HomeyLib from 'homey/lib/Homey'

import type MELCloudExtensionApp from './app.mts'

declare module 'homey/lib/Homey' {
  interface Homey extends HomeyLib {
    app: MELCloudExtensionApp
  }
}
