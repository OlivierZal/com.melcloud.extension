# MELCloud extension for Homey

A [Homey](https://homey.app/) app extending [MELCloud & MELCloud Home](https://homey.app/a/com.mecloud), the MELCloud app, with automatic cooling adjustment based on the outdoor temperature.

[![License](https://img.shields.io/github/license/OlivierZal/com.melcloud.extension)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/OlivierZal/com.melcloud.extension?sort=semver)](https://github.com/OlivierZal/com.melcloud.extension/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/OlivierZal/com.melcloud.extension/ci.yml?branch=main&label=CI)](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/ci.yml)
[![Validate](https://img.shields.io/github/actions/workflow/status/OlivierZal/com.melcloud.extension/validate.yml?branch=main&label=Validate)](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/validate.yml)
[![CodeQL](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/OlivierZal/com.melcloud.extension/actions/workflows/github-code-scanning/codeql)

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=OlivierZal_com.melcloud.extension&metric=alert_status)](https://sonarcloud.io/dashboard?id=OlivierZal_com.melcloud.extension)
[![Test coverage](https://sonarcloud.io/api/project_badges/measure?project=OlivierZal_com.melcloud.extension&metric=coverage)](https://sonarcloud.io/component_measures?id=OlivierZal_com.melcloud.extension&metric=coverage)

## What it does

While one of your air-to-air heat pumps cools ("Thermostat mode" on "Cool"), the extension keeps its "Target temperature" no more than 8 °C below the outdoor temperature: with 34 °C outside, a unit you set to 23 °C is raised to 26 °C. It never sets the target below your own temperature (the one you chose) or above the unit's maximum (31 °C), and it restores your own temperature when the unit stops cooling or when you switch the adjustment off.

The extension adds no device, Flow card or widget of its own. It works on the air-to-air heat pumps you added in the MELCloud app, from a MELCloud Classic account (Mitsubishi Electric's original MELCloud service) or a MELCloud Home account. You set it up on one settings page, where you choose the outdoor temperature source of each MELCloud building: "Homey weather" (the weather at your Homey's location), a temperature reading of any of your Homey devices (useful when your units are not all in the same place), or "Do not adjust".

Why?

- Because it's better for your heat pumps.
- Because it's better for your health.
- Because it's better for the environment.

## Requirements

- A Homey Pro with Homey v12.9.0 or later. The app does not run on Homey Cloud.
- The MELCloud app, with at least one air-to-air heat pump added. The extension itself asks for no account.

## Getting started

1. Install [MELCloud extension](https://homey.app/a/com.mecloud.extension) from the Homey App Store.
2. Open its settings and, under "Configuration", choose the outdoor temperature source of each building.
3. Set "Keep within 8 °C of the outdoor temperature" to "Yes" and press "Update".

Nothing is adjusted until step 3 is done. The units you already had when you installed the extension are preset to "Homey weather". A unit you add later takes the choice the other units of its building share; when they share none, it starts on "Do not adjust".

## Good to know

- Only "Cool" counts: in any other "Thermostat mode", "Automatic" included, a unit is left alone. Air-to-water heat pumps and energy recovery ventilators are never adjusted.
- A target you set by hand while a unit cools becomes your own temperature. If it is more than 8 °C below the outdoor temperature, the extension raises it again and brings your value back when the adjustment stops.
- "Homey weather" is read again every 15 minutes while a unit cools, and a device's reading is followed as it changes. When the outdoor temperature cannot be read, your own temperature applies.
- An air-to-air unit can serve as a source only through its "Outdoor temperature", which MELCloud Classic units have and MELCloud Home units do not.
- The settings page shows one field per MELCloud building; a unit it cannot place in a building gets a field of its own. To search a long list of sources, tap the field a second time and type.
- "History", at the bottom of the settings page, lists what the extension did and what went wrong. If a source no longer exists, for example, the units that used it are skipped and the others keep running.
- To be sure your own temperatures are back before you disable or uninstall the extension, switch the adjustment off first.

## Supported languages

Arabic, Danish, Dutch, English, French, German, Italian, Korean, Norwegian, Polish, Russian, Spanish, Swedish.

## Help and feedback

Ask questions and share feedback in the [Homey Community topic](https://community.homey.app/t/73094), which the extension shares with the MELCloud app. Report a problem or request a feature on the [issues page](https://github.com/OlivierZal/com.melcloud.extension/issues). To report a security vulnerability, follow [SECURITY.md](SECURITY.md).

## Contributing

To work on the app itself, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

This app is not endorsed, verified or approved by Mitsubishi Electric Corporation. Mitsubishi cannot be held liable for any claims or damages that may occur when using this app to control MELCloud devices.

## License

[GPL-3.0-only](LICENSE) © Olivier Zalmanski
