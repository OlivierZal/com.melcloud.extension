import type MELCloudExtensionApp from './app.mts'

declare module 'homey' {
  interface HomeyTypes {
    app: MELCloudExtensionApp
  }
}
