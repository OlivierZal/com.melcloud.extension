import changelogData from './.homeychangelog.json' with { type: 'json' }

type Changelog = Record<string, Record<string, string>>

export const changelog: Changelog = changelogData
