import HomeySdk from 'homey'

/* eslint-disable @typescript-eslint/prefer-destructuring -- TS9019: isolatedDeclarations bans exported binding elements */
export const App: typeof HomeySdk.App = HomeySdk.App
/* eslint-enable @typescript-eslint/prefer-destructuring -- end of the TS9019 re-export */
