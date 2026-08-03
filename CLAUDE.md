# CLAUDE.md

Homey app extending com.melcloud with automatic cooling adjustment based
on an outdoor temperature source. ESM only, Node >= 22.19. It talks to
the MELCloud devices exclusively through the local Homey API (`homey-api`)
— device behavior is fixed in com.melcloud (sibling repo with its own
CLAUDE.md), never worked around here.

## Inter-app API dependency

This app has no npm dependency on the MELCloud stack — its real
dependency is WIRE-LEVEL, against whatever com.melcloud version is
installed alongside, and it is one-directional (com.melcloud never calls
back). The consumed surface, exhaustively:

- `GET /devices/groups` on com.melcloud's app API — the building
  grouping. The contract is DEGRADE, never fail: an absent route (older
  com.melcloud, app not installed) or an off-shape payload reads as "no
  grouping" (`to-device-groups.mts` sanitizes; the settings page falls
  back to one flat group). Never assume the route exists.
- The MELCloud devices themselves through `homey-api`
  (`HomeyAPIV3Local`): driver ids (`melcloud`, `home-melcloud`),
  capability ids (`target_temperature`, `thermostat_mode`,
  `measure_temperature`*), and `device.data.id` as the join key between
  Homey devices and `/devices/groups` entries — Classic serializes a
  NUMBER as string, Home a GUID, which is why joins go through
  `toJoinKey` (`group-devices.mts`) and nothing else; #1229 was exactly
  a join done another way.
- Per-device failures are reported and skipped (`#listenToDevice`), so
  one renamed capability cannot take the whole adjustment down.

Changing any of these on the com.melcloud side is a cross-repo change:
check this app the way byte-identical kernels are checked. The exact-pin
rule of the npm consumers has no equivalent here — the wire tolerates
version skew by design, which is why every consumed shape is sanitized
at entry.

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
- `npm run build` — esbuild bundle (`scripts/bundle.mts`) + `tsc`
  emit, BOTH into `.homeybuild`. The Homey CLI runs `npm run build`
  when it detects TypeScript — but only AFTER its pre-process copy into
  `.homeybuild`, so the source tree stays sources-only and everything
  the package needs must be emitted there: tsc does it via `outDir`,
  and `bundle.mts` emits the settings bundles there too (its former
  source-tree outfiles landed too late to be copied — the com.melcloud
  #1404 root cause: store installs 404'd the bundles). The CLI's own
  build invocation is therefore sufficient for install, run, validate
  and publish alike; a standalone suite run (no `.homeybuild` page
  copy) still proves the bundles compile.
- Cache-busting `?v=` — a PACKAGE-TIME transform: `bundle.mts` stamps
  every local asset reference of the `.homeybuild` page copy with a
  content hash (`?v=<hash>`), so phone webviews (which cache assets
  across app versions) refetch an asset exactly when its bytes change.
  The committed source HTML carries NO stamps — never hand-add a `?v=`
  there, and nothing needs re-committing when a settings source changes
  (the old re-stamp-and-commit dance is gone). Stamps exist only in the
  packaged app, and only within attribute/import reference contexts,
  never comments.
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
- Device grouping — com.melcloud exposes `GET /devices/groups`
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
  into `settings/index.js` as a CLASSIC IIFE (`format: 'iife'`,
  `globalName: MELCloudWebview`), loaded via `<script defer src>` — NOT
  an ES module (mirrors com.melcloud). Only the JS module loader fails:
  `import()` / `<script type=module>` stall on a COLD webview open
  against Homey's local origin (the #1404 spinner), while classic
  resource fetches — the stylesheet, a classic `<script src>` — load
  cold. The HTML declares the docs' canonical global
  `function onHomeyReady(homey)` inline (it must exist at parse time),
  which polls `globalThis.MELCloudWebview` and calls its `start(homey)`.
  `defer` (as in com.melcloud) is the right fit for an app bundle that
  reads the DOM — ordered, after `<body>` parses, before
  DOMContentLoaded — and here it is doubly required: this entry does DOM
  lookups at module top level, which `defer` makes safe. The poll's 10 s
  timeout still ends the overlay if the script failed to load. Init work is separately
  time-bounded (10 s) with `homey.ready()` in a `finally`; `start` is
  non-throwing by construction (failure alerts go through
  `fireAndForget`). `scripts/bundle.mts` stamps every local asset
  reference — only inside an attribute/import context, never a comment —
  with a content hash (`?v=`): phone webviews cache assets across app
  versions. Never load the bundle as a STATIC `<script type=module>`:
  it stalls the whole boot on a cold open (shipped and reverted in
  com.melcloud, proven on-device there). Dynamic `import()` is merely
  unnecessary, not broken — its supposed Android fetch failures were
  com.melcloud #1404's missing-bundle 404s — but do not churn the
  loading mechanism without new on-device evidence: classic `defer`
  carries the bounded boot plus beacon. Phone webviews also cache the
  HTML ITSELF across
  app versions (proven on com.melcloud), so shipped bundle filenames are
  a COMPAT CONTRACT: `scripts/bundle.mts` builds the entry twice —
  `index.js` (IIFE) for the current HTML, `index.mjs` (ESM) for every
  cached ESM-era HTML, which is why the entry keeps `export const
start`. Never rename or drop a shipped bundle filename; add alongside.
  When the bundle still fails to boot, the `onHomeyReady` poll's timeout
  beacon POSTs the `userAgent` plus a `fetch` probe of the bundle to
  `/boot-error` (`app.error`) before degrading, distinguishing a fetch
  failure from a parse-or-runtime crash (pre-es2020 engines). Webview
  runtime-API floor: es2023 array methods are accepted
  (`toSorted`/`toReversed` ship today), but nothing newer — no iterator
  helpers (`.entries().map()`, 2025-era): esbuild lowers syntax only. Settings pages and
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
- App-API surface conventions (aligned on com.melcloud): paths are
  kebab-case REST, `get*` for GET — except `is*` for a boolean GET —,
  `update*` for PUT, a business verb for POST (`logWebviewBoot` on
  `/boot-error`); `fetch*` in the webview is reserved
  for transport calls (`load*` reads the settings store). The
  auto-adjustment path is `/cooling/auto-adjustment` (the snake_case
  legacy alias was dropped by decision, 2026-07 — a cached pre-rename
  bundle now alerts on Apply until it refreshes). The com.melcloud
  grouping is `GET /devices/groups` only; an older com.melcloud reads
  as "no grouping" (the sanitizer's degradation path).
  `settings/callback-api.mts` is the settings page's transport
  (error-first-callback SDK), a byte-identical copy of com.melcloud's
  (com.heatzy carries the third) — edit all three together. The surface
  is test-pinned in two halves, one file each — extend BOTH when
  touching a route: `tests/unit/api-contract.test.ts` pins manifest
  ids ↔ handlers both ways plus the handlers' function type;
  `tests/unit/api-route-guards.test.ts` pins the call sites (every
  settings path literal must match a declared route).
- Dirty-gating: `settings/dirty-gate.mts` is the ONE primitive behind the
  Update/Refresh pair — never re-derive its invariant at a call site. Its
  `serialize` must stay a PURE form snapshot, never a request-body
  builder, and disabled greying styles `button:disabled` generically,
  never a per-class list. `tests/dirty-gate.test.ts` locks the behavior;
  the module is a byte-identical copy of com.melcloud's
  `public/dirty-gate.mts` (com.heatzy carries the third copy) — edit all
  three together.
- Home ATA devices (`home-melcloud`) do NOT expose
  `measure_temperature.outdoor`; only Classic ATA devices do. The
  default outdoor-source selection and the sensor list must never
  assume it.
- Both ATA drivers share `thermostat_mode` values (incl. `cool`) and
  the 10–31 °C `target_temperature` range; the setpoint ceiling is read
  from `capabilitiesObj` at runtime (31 °C fallback).
- The threshold (user comfort setpoint) is persisted per device id in
  the `thresholds` setting. A missing entry means ABSENT, never a
  stand-in value: reverting writes nothing and reports `log.noThreshold`
  (it used to send 0 °C — the placeholder reaching the unit as a real
  command). A missing outdoor reading is treated the same way: no
  efficiency floor rather than one computed from 0, and
  `#getTargetTemperature` returns `null` when neither floor is known.
- Outdoor sources are per device (`outdoorSources` setting: null/absent
  = Homey weather, `'none'` = the device is not adjusted at all); the
  legacy global `capabilityPath` is migrated to every known AC device
  once, then unset.
- Both per-device maps are reached ONLY through the app's accessor pairs
  (`outdoorSources`, `thresholds`): the key name and its sanitizer live
  together, the getter hands back a sanitized fresh copy, and no caller
  can write past the contract its reader assumes.
- Entries for devices Homey no longer knows are deliberately NOT pruned.
  They are inert — `#inheritedSource` matches on the live grouping, and
  Homey ids are UUIDs, so a stale entry can neither be resurrected nor
  influence an inheritance. Pruning was designed and refused: the only
  place to run it is after `#loadDevices`, which empties the device list
  before its network call, so any hiccup (com.melcloud stopped, a failed
  read) would wipe every source and threshold the user configured — and
  a wrongly-pruned source does not self-heal, the device re-seeds as a
  newcomer straight to `DISABLED_SOURCE`. Map hygiene does not justify a
  destructive operation on user configuration.
- Grouping joins on the MELCLOUD id (`device.data.id`), never the Homey
  id: `/devices/groups` speaks MELCloud ids while every settings map is
  keyed by Homey id. `lib/group-devices.mts` exports `toJoinKey` as the
  single home for that conversion — confusing the two spaces silently
  broke building inheritance for every newcomer, and test fixtures must
  give devices a `melcloudId` distinct from their `id` or they cannot
  catch it.
- The Homey weather (home-screen temperature) is served by the LOCAL
  weather manager. Route it through the connected homey-api session's
  generic `call({method, path: '/api/manager/weather/weather'})`: the
  app-side `homey.api.get` rejects with `Missing Session`, and homey-api
  ships no weather manager wrapper (absent from its local
  specification). Read `temperatureCelsius`, not `temperature`
  (unit-dependent); poll it (no push events), readings are sanitized by
  `lib/to-temperature.mts` (anything non-finite reads as null, never
  0/NaN).

## Naming & authored-content conventions

- What `@typescript-eslint/naming-convention` cannot see is convention
  too: booleans read as questions even untyped (`isX`/`hasX`), handlers
  as verbs; a name states what the thing IS, never its history. Test
  files are named after the unit under test (`<module>.test.ts`); shared
  test helpers keep their family's names — apps say `assertDefined` and
  `mock(overrides)` where the libraries say `defined` and
  `mock(value?)`: two test families, deliberately not unified.
- Static markup and styles live in `.html`/`.css` files. TS builds DOM
  only when the content is programmatic (computed values, per-item
  nodes), via `createElement` — never `innerHTML` (`no-unsafe-dom-html`
  enforces it). Inline style writes are reserved for values CSS cannot
  express; anything static belongs in the stylesheet, following the
  CSS/HTML lint rules' spirit even where no rule captures it.
- The webview runtime floor (es2023, no `Object.groupBy`, no iterator
  helpers) is enforced by a scoped lint block over `settings/` — the
  tsconfig cannot express two runtimes in one project. Node-side code
  may use the newer APIs freely.

## Lint doctrine

- Code adapts to the rules, never the reverse. Never add a disable —
  not inline, not through config options or ignore regexes: refactor
  until the rule passes. One counterweight: when every compliant shape
  reads worse than the violation (a rule-pair conflict, a
  protocol-imposed form), the documented disable IS the honest form.
  Current irreducibles: the fire-and-forget disable (once, in
  `lib/fire-and-forget.mts` — the settings page wraps it for its
  default `onError`) and the TS9019 isolatedDeclarations carve-out in
  `lib/homey.mts`.
- Naming is stricter than com.melcloud: properties are camelCase-only
  in app code. The tests block relaxes it (documented in the config)
  because test doubles mirror external contracts: capability ids
  (snake_case, dotted), device ids (hyphenated), module export names
  (PascalCase) and Homey's `__` translation method.
- Ambient `*.d.ts` files have a scoped carve-out (script parse,
  namespace-merged classes) — also documented in the config.
- A config-level `'off'` with a one-line reason is not a disable: it
  is the triage ledger for opt-in rules that were evaluated and
  refused (tool-ownership overlap, platform floor, absent domain).
  Disables suppress an adopted rule; ledger entries record a verdict —
  re-evaluate one when its stated reason expires (target bump, new
  tooling).
- Zero-warning policy: every enabled rule is at `error`.
- Test doubles are SYNC where the real API is async (the caller's
  `await` handles both): `mockImplementation(async …)` without an await
  trips `require-await`, and non-async promise-returning arrows trip
  `promise-function-async` — type the `vi.fn` as value-returning
  instead.
- `useDefineForClassFields` wipes fields assigned by `super()`: a
  subclass re-declaring an Error option (like `cause`) must use
  `declare`, not a field initializer.
- All-type exports hoist the keyword (`export type { A, B }`); mixed
  exports keep inline `type` specifiers, mirroring the
  inline-type-imports style. No shipped rule enforces the export side
  (`consistent-type-exports` tolerates inline specifiers once present;
  `import-x/consistent-type-specifier-style` covers imports only): the
  convention is maintained by hand, in review — a bespoke
  `no-restricted-syntax` selector for it was removed by decision
  (2026-07-28).

## Repo process

- Design phases (on Olivier's call, start and end): iterate on
  `design/*` branches with dev-installs only — no PR merges, no tags,
  no releases, no App Store publishes until he lifts the pause.
- `main` is protected (PRs only, squash merges); CI must be green.
- The PR title IS the commit that lands: `squash_merge_commit_title` is
  `PR_TITLE`, so the title is the single source (under the former
  `COMMIT_OR_PR_TITLE`, a one-commit PR silently took its commit subject
  instead). It must follow Conventional Commits, which the required
  `PR title` check enforces (`.github/workflows/pr-title.yml`,
  byte-identical in the five repos) — default type set, no scope
  allowlist, and no `subjectPattern`: subjects legitimately open on a
  proper noun. Dependabot's prefixes are pinned to `build(deps)` /
  `build(deps-dev)` rather than inferred, which is what had it land a
  different style in each repo.
- After every push, monitor the triggered pipelines to completion — the
  PR checks after a push, the publish run after a release tag — and act
  on the outcome: rerun transient infra failures (a SonarCloud 504 is
  not a finding), fix real ones. Work is not done while its pipeline is
  red or unwatched.
- Copilot reviews every PR, and every review thread (Copilot or human)
  must end RESOLVED: with a code change when the point holds, or with a
  reasoned reply when it does not — verify claims against sources
  before acting either way. Resolve the thread once settled; none left
  dangling.
- SonarCloud must be spotless for a PR to merge: quality gate green,
  zero open issues on its analysis, and 100 % coverage (within the
  exclusions `sonar-project.properties` declares). A Sonar finding is
  handled like a lint error — the code adapts, or the divergence is
  settled as a documented verdict — never merged over.
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
