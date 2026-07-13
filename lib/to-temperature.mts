// Sanitizes an external reading: anything but a finite number (missing
// capability value, unexpected payload) reads as "no measurement" rather
// than silently becoming 0 or NaN.
export const toTemperature = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
