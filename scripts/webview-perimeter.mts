// The webview perimeter, declared once and shared by the bundler, the
// lint and the floor suite: `tests/unit/webview-floor.test.ts` asks
// esbuild for the metafile of these entry points and checks every
// input it emits against these globs, so the two cannot drift apart
// unnoticed.
export const entryPoints: readonly string[] = ['settings/index.mts']

// `types.mts` is cross-surface: the settings bundle emits its
// constants (measured by metafile), so it carries the floor too.
export const webviewFloorFiles: readonly string[] = [
  'settings/**/*.mts',
  'types.mts',
]
