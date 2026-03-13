import type { Changelog } from './types.mts'

import changelogData from './.homeychangelog.json' with { type: 'json' }

export const changelog: Changelog = changelogData
