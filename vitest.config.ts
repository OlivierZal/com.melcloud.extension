import { defineConfig } from 'vitest/config'

const config = defineConfig({
  test: {
    coverage: {
      exclude: ['settings/**/*.mts'],
      include: ['**/*.mts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})

export default config
