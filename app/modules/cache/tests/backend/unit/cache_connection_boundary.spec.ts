import fs from 'node:fs/promises'
import path from 'node:path'

import { test } from '@japa/runner'

const APP_ROOT = path.resolve(process.cwd(), 'app')
const START_ROOT = path.resolve(process.cwd(), 'start')
const CACHE_CONNECTION_OWNERS = new Set([
  path.resolve(APP_ROOT, 'modules/cache/infra/redis_cache_store.ts'),
  path.resolve(APP_ROOT, 'modules/cache/health_checks/cache_redis_health_checks.ts'),
])
const DIRECT_CACHE_CONNECTION_PATTERN = /\.connection\(\s*['"](?:cache|cacheSubscriber)['"]\s*\)/

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'tests') {
          return []
        }
        return collectTypeScriptFiles(absolutePath)
      }
      return entry.isFile() && entry.name.endsWith('.ts') ? [absolutePath] : []
    })
  )
  return files.flat()
}

test('Cache architecture | only the cache module owns the raw cache Redis connection', async ({
  assert,
}) => {
  const violations: string[] = []

  for (const root of [APP_ROOT, START_ROOT]) {
    for (const absolutePath of await collectTypeScriptFiles(root)) {
      const source = await fs.readFile(absolutePath, 'utf8')
      if (
        DIRECT_CACHE_CONNECTION_PATTERN.test(source) &&
        !CACHE_CONNECTION_OWNERS.has(path.normalize(absolutePath))
      ) {
        violations.push(path.relative(process.cwd(), absolutePath))
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Direct cache Redis connection bypasses bounded cache ports: ${violations.join(', ')}`
  )
})
