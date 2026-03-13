# CLAUDE.md

## Project overview

Homey app extension for MELCloud — adds automatic cooling adjustment based on outdoor temperature sensors. Runs on Homey (>=12.9.0) with Node.js 22.

## Tech stack

- **Language**: TypeScript (strict mode, `.mts` files)
- **Runtime**: Node.js 22 (Homey platform)
- **Module system**: ESM (`"type": "module"`, `module: "preserve"` in tsconfig)
- **Linting**: ESLint 10 (flat config) with typescript-eslint, import-x, perfectionist, unicorn, stylistic
- **Formatting**: Prettier (no semicolons, single quotes)

## Build & validation commands

- `npm run build` — full build (prepare + tsc)
- `npm run lint` — ESLint check
- `npm run lint:fix` — ESLint with auto-fix
- `npm run format` — Prettier check
- `npm run format:fix` — Prettier with auto-fix
- `npx tsc --noEmit` — type check only

## Code conventions

- No semicolons, single quotes, trailing commas
- `const` arrow functions preferred over function declarations (`func-style` rule)
- Strict naming: camelCase for variables, PascalCase for types/classes, UPPER_CASE for const primitives
- All interfaces use `readonly` properties
- Type imports use `import type` (verbatimModuleSyntax)
- No `any` — use `unknown` and narrow
- No default exports except where Homey SDK requires them (app.mts, driver files, api.mts)

## Architecture

- `app.mts` — main Homey app entry point (default export required by Homey)
- `listeners/` — temperature listener classes (abstract base + MELCloud + outdoor temperature)
- `settings/index.mts` — browser-side settings UI (loaded as classic script, not module)
- `types.mts` — shared TypeScript interfaces and constants
- `files.mts` — file re-exports (changelog JSON)
- `homey-api-override.d.ts` — ambient module declaration augmenting `homey-api` types
- `.homeybuild/` — compiled output (gitignored)

## Important patterns

- `homey` package is a runtime-provided dependency — not in `dependencies`, uses `eslint-disable` for `import-x/no-extraneous-dependencies`
- `Homey.App`, `Homey.Driver` accessed as default member — uses `eslint-disable` for `import-x/no-named-as-default-member`
- `settings/index.mts` compiles to `.mjs` but loads as classic script in browser — `onHomeyReady` must be a function declaration (not arrow), has `@ts-expect-error` + `eslint-disable func-style`
- `homey-api-override.d.ts` uses `declare module 'homey-api'` to augment types — ignored by ESLint
