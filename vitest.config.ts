import { coverageDefaults } from '@olivierzal/configs/vitest-coverage'
import { type ViteUserConfig, defineConfig } from 'vitest/config'

const config: ViteUserConfig = defineConfig({
  test: {
    coverage: {
      ...coverageDefaults,
      exclude: ['.homeybuild/**'],
      include: ['**/*.mts'],
    },
  },
})

export default config
