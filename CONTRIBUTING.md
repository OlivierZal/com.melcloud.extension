# Contributing

Thanks for considering a contribution. This document describes the local
workflow expected before opening a pull request.

## What this app is

An **extension**: it pairs no device of its own and ships no driver. It
drives the air-to-air units already paired with the MELCloud app, over
the inter-app API (`homey-api`), and exposes a single settings page. Its
whole surface is that page plus the listeners that keep it in step.

## Prerequisites

- Node.js matching `engines.node` in [`package.json`](package.json) —
  currently `^22.22.2 || >=24.15.0`, the **development** floor derived
  from the installed tree, not the floor the device runs
- npm 10+
- A GitHub personal access token with the `read:packages` scope, exported
  as `NODE_AUTH_TOKEN` — [`.npmrc`](.npmrc) reads that variable to fetch
  the `@olivierzal` packages from GitHub Packages
- A Homey Pro with the MELCloud app installed and at least one air-to-air
  device paired, for anything beyond a unit test

## Setup

```sh title="setup"
git clone https://github.com/OlivierZal/com.melcloud.extension.git
cd com.melcloud.extension
npm ci
```

## Local checks

Run the full suite before pushing — CI runs all of it, and each step has
caught failures the others miss:

```sh title="checks"
npm run format          # prettier --check (npm run format:fix to write)
npm run lint            # ESLint, including CSS and HTML
npm run typecheck       # native tsc --noEmit
npm test                # vitest run
npm run test:coverage   # must remain at 100% on all four axes
npm run build           # esbuild bundle + tsc emit, both into .homeybuild
npm run homey:validate  # Homey validation at publish level
```

`npm run homey:validate` **may rewrite files** — `app.json` and
`locales/*.json` are generated. If it touches anything, amend before
pushing.

## Generated files are not sources

[`.homeycompose/`](.homeycompose) is the source for `app.json` and
`locales/*.json`. The Homey CLI regenerates those outputs on every
preprocess and writes them **without a trailing newline**. Commit the
CLI-generated form verbatim; never edit a generated file directly, and
never "fix" the missing newline.

## The app id carries an inherited typo, deliberately

This app ships as `com.mecloud.extension`, echoing the missing `l` of the
MELCloud app it extends — a misspelling from that app's original
submission, now load-bearing on both sides. The id is the platform
identity, so correcting it would create a new app and orphan every
install. Never add the missing `l`, in the manifest, the code or the
docs.

## Two runtimes, two floors

Node-side code follows `engines.node` and may use modern APIs freely.

Webview code — [`settings/`](settings) — runs on **phone browser
engines**, not on the Homey. Their ceiling is **es2023**, derived from the
Homey mobile app's own minimum of iOS 16.4 (App Store, 2026-08-11) and
enforced by the lint on exactly that path. esbuild lowers syntax but never
polyfills APIs, so a too-recent API passes both the lint and the compile
and fails only on a user's phone. Raising one floor never raises the
other; conflating them has already caused a production incident in a
sibling app.

The floor the device runs is a third, distinct declaration:
`compatibility` in [`.homeycompose/app.json`](.homeycompose/app.json).

## Diverging from the shared kit is allowed, but never silent

`@olivierzal/homey-kit` carries the primitives the three apps share. What
stays local here stays by measurement, and
[`CLAUDE.md`](CLAUDE.md) records each verdict with its reason — the
`NotFoundError` whose exact message the settings page matches on, the
stricter `ManagerSettings` augmentation, the webview `fireAndForget` that
surfaces in the dev tools rather than through a logger. Adopting the kit
version blind would break behaviour no test watches. If you diverge,
write the verdict down; an unrecorded divergence is indistinguishable
from an oversight.

## On-device testing

```sh title="device"
npm run homey:start     # homey app run --remote
npm run homey:install
```

Any markup change that multiplies `homey-form-*` elements needs a cold
open on a real device: Homey injects a stylesheet that is not in this
repo, and a headless probe cannot see it.

## Coverage

Branches, functions, lines and statements are enforced at **100%** in
[`vitest.config.ts`](vitest.config.ts). New code arrives with the tests
that keep those thresholds green. A test that cannot fail proves nothing
— verify by mutation that a new test breaks when the behaviour it pins
breaks.

## Commits & pull requests

- **The pull request title is the commit that lands.** Squash merging is
  the only merge method and it takes the PR title, so the title must
  follow [Conventional Commits](https://www.conventionalcommits.org).
  A required check enforces it.
- Companion docs are part of a change's definition of done: a pull
  request that changes behaviour, API surface, requirements or process
  updates [`README.md`](README.md), this file,
  [`SECURITY.md`](SECURITY.md) and [`CLAUDE.md`](CLAUDE.md) in the same
  pull request — never in a later sweep.
- All required checks must pass, and every review thread must end
  resolved: with a change when the point holds, or with a reasoned reply
  when it does not.

## Releases

Store releases are cut through a pull request: write the user-facing
entry into `.homeychangelog.json` under the new version key **in all 13
locales**, bump `version` in `.homeycompose/app.json`, align
`package.json` with `npm version X.Y.Z --no-git-tag-version`, then run
`npm run homey:validate` to regenerate `app.json`. Once merged, tag
`vX.Y.Z` and publish a GitHub release — that is what pushes the app to
the store.

A changelog entry is **deliberately non-exhaustive**: it addresses the
user, so tooling, refactors and test work stay out of it. When a release
would carry nothing a user can observe, the honest move is not to cut one
— publishing burns a version number and a store review for nothing. A
rejected version number cannot be resubmitted; bump the patch instead.
