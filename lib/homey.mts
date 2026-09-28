import Homey from 'homey'

/* eslint-disable @typescript-eslint/prefer-destructuring -- TS9019: isolatedDeclarations bans exported binding elements */
export const App: typeof Homey.App = Homey.App
/* eslint-enable @typescript-eslint/prefer-destructuring -- end of the TS9019 re-export */

export type { default as Homey } from 'homey'
