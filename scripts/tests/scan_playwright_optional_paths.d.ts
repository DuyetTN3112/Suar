declare module '../../../scripts/tests/scan_playwright_optional_paths.mjs' {
  export function scanOptionalCriticalPaths(files: string[]): Promise<string[]>
  export default scanOptionalCriticalPaths
}
