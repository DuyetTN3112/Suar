import { readFile } from 'node:fs/promises'

const OPTIONAL_PATTERNS = [
  { pattern: /if\s*\(\s*await\s+.*locator\(.*\)\.count\(\)\s*>\s*0\s*\)/g, description: 'locator.count() > 0 guard' },
  { pattern: /if\s*\(\s*await\s+.*isVisible\(\)\s*\)/g, description: 'isVisible() guard' },
]

export async function scanOptionalCriticalPaths(files) {
  const offenders = []
  for (const file of files) {
    let source
    try { source = await readFile(file, 'utf8') } catch { continue }
    for (const { pattern } of OPTIONAL_PATTERNS) {
      pattern.lastIndex = 0
      if (pattern.test(source)) { offenders.push(file); break }
    }
  }
  return [...new Set(offenders)]
}

export default scanOptionalCriticalPaths
