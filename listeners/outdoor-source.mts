import type MELCloudExtensionApp from '../app.mts'
import { formatTemperature } from '../lib/format-temperature.mts'
import { toTemperature } from '../lib/to-temperature.mts'
import type { MELCloudListener } from './melcloud.mts'

// An outdoor temperature feed shared by the AC devices configured on it.
// Watching starts with the first cooling subscriber and stops with the
// last one; every reading change recalculates the subscribed devices.
export abstract class OutdoorSource {
  public abstract readonly name: string

  public get value(): number | null {
    return this.#value
  }

  protected readonly app: MELCloudExtensionApp

  readonly #subscribers = new Set<MELCloudListener>()

  #value: number | null = null

  // Single-flight guard: concurrent attaches await the same start, so
  // the underlying watcher is armed exactly once per active cycle
  #watching: Promise<void> | null = null

  protected constructor(app: MELCloudExtensionApp) {
    this.app = app
  }

  protected abstract start(): Promise<void>

  protected abstract stop(): void

  public async attach(listener: MELCloudListener): Promise<void> {
    this.#subscribers.add(listener)
    this.#watching ??= this.start()
    await this.#watching
  }

  public destroy(): void {
    this.#subscribers.clear()
    this.stop()
    this.#watching = null
  }

  public detach(listener: MELCloudListener): void {
    this.#subscribers.delete(listener)
    if (this.#subscribers.size === 0) {
      this.stop()
      this.#watching = null
    }
  }

  protected initialize(reading: unknown): void {
    this.#value = toTemperature(reading)
  }

  protected async update(reading: unknown): Promise<void> {
    const value = toTemperature(reading)
    if (value === this.#value) {
      return
    }
    this.#value = value
    this.app.pushToUI('listened', {
      capability: this.app.names.temperature,
      name: this.name,
      value: formatTemperature(value),
    })
    await Promise.all(
      this.#subscribers
        .values()
        .map(async (listener) => listener.setTargetTemperature()),
    )
  }
}
