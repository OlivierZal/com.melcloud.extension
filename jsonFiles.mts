export const { changelog } = await (async (): Promise<{
  changelog: object
}> => {
  try {
    return await import('./lib/jsonFilesWithImport.mts')
  } catch {
    return import('./lib/jsonFilesWithRequire.mjs')
  }
})()
