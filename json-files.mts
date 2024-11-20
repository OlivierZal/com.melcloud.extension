export const { changelog } = await (async (): Promise<{
  changelog: object
}> => {
  try {
    return await import('./lib/json-files-with-import.mts')
  } catch {
    return import('./lib/json-files-with-require.mjs')
  }
})()
