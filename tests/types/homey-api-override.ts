/**
 * Compile-time guards over the ambient `homey-api` declaration. A `.d.ts`
 * is never checked under `skipLibCheck`: a name it fails to resolve — as
 * `Homey` did until 2026-11-04 — keeps its spelling but relates like
 * `any`, so `createAppAPI` accepted anything in silence, and a
 * conditional type over it resolves to BOTH branches (measured on
 * TypeScript 7: an `IsAny`-style probe reads `boolean`, so no conditional
 * guard trips). What trips is the refusal below: a value the real
 * parameter rejects becomes accepted, and the directive turns unused
 * (TS2578). Checked by `typecheck`, not by the test run: the types erase.
 */
import type { Homey } from 'homey'
import type { HomeyAPIV3Local } from 'homey-api'

type CreateAppApiHomey = Parameters<
  typeof HomeyAPIV3Local.createAppAPI
>[0]['homey']

// The SDK instance fits the parameter — the direction the app relies on.
export const canSdkInstanceCreateAppApi: Homey extends CreateAppApiHomey
  ? true
  : false = true

// A number does not: the parameter resolved, to something that refuses.
// @ts-expect-error -- a number is not the SDK instance
export const numberRefusedByCreateAppApi: CreateAppApiHomey = 42
