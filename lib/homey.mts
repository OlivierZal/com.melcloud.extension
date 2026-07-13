import Homey from 'homey'

/* eslint-disable @typescript-eslint/prefer-destructuring -- TS9019: isolatedDeclarations bans exported binding elements */
export const App: typeof Homey.App = Homey.App
/* eslint-enable @typescript-eslint/prefer-destructuring */

export type { default as Homey } from 'homey'
