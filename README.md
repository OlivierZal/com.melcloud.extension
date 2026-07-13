# Extension for MELCloud Homey App

A [Homey](https://homey.app/) app extending the [MELCloud app](https://homey.app/a/com.mecloud) with automatic cooling adjustment based on the outdoor temperature.

[![License](https://img.shields.io/github/license/OlivierZal/com.melcloud.extension)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/OlivierZal/com.melcloud.extension?sort=semver)](https://github.com/OlivierZal/com.melcloud.extension/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/OlivierZal/com.melcloud.extension/ci.yml?branch=main&label=CI)](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/ci.yml)
[![Validate](https://img.shields.io/github/actions/workflow/status/OlivierZal/com.melcloud.extension/validate.yml?branch=main&label=Validate)](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/validate.yml)
[![CodeQL](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/github-code-scanning/codeql)

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=OlivierZal_com.melcloud.extension&metric=alert_status)](https://sonarcloud.io/dashboard?id=OlivierZal_com.melcloud.extension)
[![Test coverage](https://sonarcloud.io/api/project_badges/measure?project=OlivierZal_com.melcloud.extension&metric=coverage)](https://sonarcloud.io/component_measures?id=OlivierZal_com.melcloud.extension&metric=coverage)

## Introduction

This app auto-adjusts the target temperature of your air-to-air devices — paired through either a MELCloud (classic) or a MELCloud Home account — to keep cooling within 8 °C of the outdoor temperature. Each device gets its own outdoor source: the weather at your Homey's location by default, or any temperature capability you pick (useful when your units are not all in the same place).

Why?

- Because it's better for your heat pumps.
- Because it's better for your health.
- Because it's better for the environment.

## Usage

1. You must have a Homey Pro.
2. Install the [MELCloud Homey app](https://homey.app/a/com.mecloud) from the Homey App Store.
3. Pair your devices.
4. Install the [MELCloud Homey app extension](https://homey.app/a/com.mecloud.extension) from the Homey App Store.
5. Configure your outdoor temperature source in the settings of the MELCloud Homey app extension.

## Supported languages

Danish, Dutch, English, French, Norwegian, Spanish, Swedish.

## Development

Requirements: Node.js 22 (see `.nvmrc`) and the [Homey CLI](https://apps.developer.homey.app/the-basics/getting-started) (`npx homey`).

```bash title="Common commands"
npm ci               # install dependencies
npm test             # run the test suite (vitest)
npm run typecheck    # type-check with the native TypeScript compiler
npm run lint         # eslint (TS, HTML, CSS, JSON, YAML, Markdown)
npm run build        # bundle the settings page (esbuild) + native tsc compile
npm run homey:start  # run the app on your Homey (remote)
```

Architecture notes:

- The settings page (`settings/`) is bundled by `scripts/bundle.mjs` into one self-contained `settings/index.mjs`; the output is gitignored and rebuilt by `npm run build`, which the Homey CLI runs automatically on validate/publish.
- Both the build and `npm run typecheck` use the native TypeScript 7 compiler (`typescript@7` aliased as `@typescript/native`) for speed; `typescript@6` remains alongside it for tools that need the JS API (typescript-eslint).
- Test coverage is enforced at 100% for backend code; browser glue (`settings/`) is excluded from coverage.

## Disclaimer

This app is not endorsed, verified or approved by Mitsubishi Electric Corporation. Mitsubishi cannot be held liable for any claims or damages that may occur when using this app to control MELCloud devices.

## License

GPL-3.0-only
