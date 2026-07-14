# CLAUDE.md

Homey app extending com.melcloud with automatic cooling adjustment based
on an outdoor temperature source. ESM only, Node >= 22.19. It talks to
the MELCloud devices exclusively through the local Homey API (`homey-api`)
— device behavior is fixed in com.melcloud (sibling repo with its own
CLAUDE.md), never worked around here.

## Commands

Run the FULL suite before any push — CI runs all of it:

- `npm run format` / `npm run format:fix` — prettier (eslint does NOT
  cover formatting).
- `npm run lint` / `npm run lint:fix` — ESLint (also lints CSS, HTML,
  JSON, YAML and Markdown via the language plugins).
- `npm run typecheck` — `tsc` from `@typescript/native` (TypeScript 7).
- `npm test` / `npm run test:coverage` — vitest; backend coverage is at
  100% (branches included), keep it there. `settings/` is browser glue
  and excluded.
- `npm run build` — esbuild bundle (`scripts/bundle.mjs`) + `tsc` emit.
  `settings/index.mjs` is a gitignored build output, never checked in;
  the Homey CLI regenerates it on validate/install/run.
- `npm run homey:validate` — Homey validation at publish level; may
  rewrite files (locales), re-stage if it does.
- `npm run homey:start` — `homey app run --remote` for on-device testing.

Check real exit codes; never pipe a check's output through `tail`/`grep`
to judge success.

## Architecture

- `app.mts` — discovers the MELCloud AC devices (`ATA_DRIVER_IDS`
  matches BOTH dialects: Classic `melcloud` and MELCloud Home
  `home-melcloud`; the app id `com.mecloud` is a historical typo) and
  the temperature sensors, debounces device events, and owns the
  per-device `MELCloudListener`s plus the shared `OutdoorSource`
  registry.
- Device grouping — com.melcloud exposes `GET /device_groups`
  (`[{ deviceIds, name }]`, one entry per MELCloud building, both
  dialects, sorted by name). The extension declares the
  `homey:app:com.mecloud` permission and calls the endpoint through
  `this.homey.api.getApiApp('com.mecloud')` when (re)loading devices.
  Any failure or off-shape payload (com.melcloud missing or too old)
  reads as "no grouping" (`null`, sanitized by
  `lib/to-device-groups.mts`) and the settings fall back to one row
  per device. The join key is `String(device.data.id)` — the MELCloud
  id com.melcloud writes at pairing (Classic numeric DeviceID, Home
  uuid); same-name buildings across dialects merge into one group and
  unmatched devices trail in an unnamed group
  (`lib/group-devices.mts`). The settings UI renders ONE select per
  building and fans the pick out to every device of the group before
  the PUT; storage stays per device (`outdoorSources`), listeners
  unchanged.
- `listeners/` — instance-based. Each `MELCloudListener` is bound to an
  `OutdoorSource` (per-device setting): `CapabilityOutdoorSource` (a
  "deviceId:capabilityId" path watched through a capability instance) or
  the shared `WeatherOutdoorSource` default. Sources hold their cooling
  subscribers: watching starts with the first `attach` (single-flight —
  concurrent attaches await one start) and stops with the last `detach`.
  melcloud.mts only imports the source as a type — no runtime cycle.
- `settings/index.mts` — browser-side settings UI, bundled by esbuild
  into `settings/index.mjs` (ES module). Webview lifecycle (mirrors
  com.melcloud): the HTML declares the docs' canonical global
  `function onHomeyReady(homey)` inline — it must exist at parse time,
  the SDK dispatches on its own schedule and a bundle only exists after
  its fetch — whose body `import()`s the bundle and hands the instance
  to its exported `start(homey)`; the inline `.catch` ends the overlay
  even when the bundle itself fails to load. Init work is time-bounded
  (10 s) and `homey.ready()` fires in a `finally`; `start` is
  non-throwing by construction (failure alerts go through
  `fireAndForget`). `scripts/bundle.mjs` stamps every local asset
  reference — attributes and the inline `import()` alike — with a
  content hash (`?v=`): phone webviews cache assets across app
  versions. Webview code sticks to es2020-era runtime APIs (esbuild
  lowers syntax only). Settings pages and
  widgets do NOT style the same way: settings follow the Homey Style
  Library (`homey-form-*`/`homey-button-*`; in a `homey-form-group` the
  control is a SIBLING after its label — see
  custom-views/html-and-css-styling in the Homey docs), while widgets
  get injected CSS variables and their own class set. Do not copy
  markup across the two, nor from com.melcloud's settings (which nest
  controls inside labels).
- `homey-api-override.d.ts` — ambient module declaration for the
  homey-api surface actually used; `homey-override.d.ts` types the app
  settings. `lib/homey.mts` re-exports the runtime-provided `homey` SDK
  (the scoped eslint carve-out for `import-x/no-extraneous-dependencies`
  lives there, not inline).

## Platform gotchas

- `.homeycompose/` is the SOURCE for `app.json` and `locales/*.json`;
  commit the CLI-generated outputs verbatim (no trailing newline).
- Home ATA devices (`home-melcloud`) do NOT expose
  `measure_temperature.outdoor`; only Classic ATA devices do. The
  default outdoor-source selection and the sensor list must never
  assume it.
- Both ATA drivers share `thermostat_mode` values (incl. `cool`) and
  the 10–31 °C `target_temperature` range; the setpoint ceiling is read
  from `capabilitiesObj` at runtime (31 °C fallback).
- The threshold (user comfort setpoint) is persisted per device id in
  the `thresholds` setting; reverting falls back to 0 °C if the stored
  entry disappeared.
- Outdoor sources are per device (`outdoorSources` setting: null/absent
  = Homey weather, `'none'` = the device is not adjusted at all); the
  legacy global `capabilityPath` is migrated to every known AC device
  once, then unset.
- The Homey weather (home-screen temperature) is served by the LOCAL
  weather manager. Route it through the connected homey-api session's
  generic `call({method, path: '/api/manager/weather/weather'})`: the
  app-side `homey.api.get` rejects with `Missing Session`, and homey-api
  ships no weather manager wrapper (absent from its local
  specification). Read `temperatureCelsius`, not `temperature`
  (unit-dependent); poll it (no push events), readings are sanitized by
  `lib/to-temperature.mts` (anything non-finite reads as null, never
  0/NaN).

## Lint doctrine

- Code adapts to the rules, never the reverse. Never add a disable —
  not inline, not through config options or ignore regexes: refactor
  until the rule passes. One counterweight: when every compliant shape
  reads worse than the violation (a rule-pair conflict, a
  protocol-imposed form), the documented disable IS the honest form.
  Current irreducibles: the fire-and-forget rule trio
  (`lib/fire-and-forget.mts`, settings copy) and the TS9019
  isolatedDeclarations carve-out in `lib/homey.mts`.
- Naming is stricter than com.melcloud: properties are camelCase-only
  in app code. The tests block relaxes it (documented in the config)
  because test doubles mirror external contracts: capability ids
  (snake_case, dotted), device ids (hyphenated), module export names
  (PascalCase) and Homey's `__` translation method.
- Ambient `*.d.ts` files have a scoped carve-out (script parse,
  namespace-merged classes) — also documented in the config.
- Zero-warning policy: every enabled rule is at `error`.
- Test doubles are SYNC where the real API is async (the caller's
  `await` handles both): `mockImplementation(async …)` without an await
  trips `require-await`, and non-async promise-returning arrows trip
  `promise-function-async` — type the `vi.fn` as value-returning
  instead.
- `useDefineForClassFields` wipes fields assigned by `super()`: a
  subclass re-declaring an Error option (like `cause`) must use
  `declare`, not a field initializer.

## Repo process

- Design phases (on Olivier's call, start and end): iterate on
  `design/*` branches with dev-installs only — no PR merges, no tags,
  no releases, no App Store publishes until he lifts the pause.
- `main` is protected (PRs only, squash merges); CI must be green.
  Copilot reviews every PR — answer every comment, verify its claims
  against sources before acting, and resolve the thread once settled.
- Homey App Store releases: write the user-facing changelog entry into
  `.homeychangelog.json` under the NEW version key (all 13 locales —
  the com.melcloud set), bump `version` in `.homeycompose/app.json`,
  align `package.json` via `npm version X.Y.Z --no-git-tag-version`,
  run `homey:validate` to regenerate `app.json`, and land it all
  through a PR. Then tag `vX.Y.Z` and publish a GitHub release:
  `publish.yml` fires on release-published (environment `homey`,
  `HOMEY_PAT`) and pushes to the App Store. Fallback when the secret is
  stale (`The access token provided is invalid`): `homey app publish`
  from an authenticated CLI — answer NO to the version prompt (a yes
  bumps and rewrites app.json) and let the changelog come from
  `.homeychangelog.json`.
- Store submissions: a rejected version number cannot be resubmitted —
  bump the patch version.
- Sonar: the CI upload step self-arms on the `SONAR_TOKEN` secret (a
  job-level env gate — the secrets context is not valid in step `if`).
  Adding the secret requires disabling automatic analysis on
  sonarcloud.io first (the two modes conflict).
