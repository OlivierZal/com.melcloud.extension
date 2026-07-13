const NON_BREAKING_SPACE = '\u{A0}'

export const formatTemperature = (
  value: boolean | number | string | null,
): string => `${String(value)}${NON_BREAKING_SPACE}°C`
