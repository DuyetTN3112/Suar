#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const TARGETS = ['app/modules', 'start/routes']
const controllerOrRoutePattern = /(\/controllers\/.*\.ts$|^start\/routes\/.*\.ts$)/

const allowList = new Set([
  'start/routes/auth.ts:@model-bootstrap',
  'start/routes/testing.ts:@cache-runtime',
  // Testing-only cache probes are intentionally allowed to observe the cache
  // plane; production controllers must still use an application boundary.
  'app/modules/testing/controllers/testing-cache/testing_cache_controller.ts:@cache-runtime',
])

const forbiddenMatchers = [
  {
    id: '@redis-runtime',
    pattern: /@adonisjs\/redis\/services\/main|#config\/redis/,
    reason:
      'presentation layer must go through action/service boundary before touching Redis runtime',
  },
  {
    id: '@cache-runtime',
    pattern: /#modules\/cache\/public_contracts\/cache_store/,
    reason: 'presentation layer must execute cache operations through an application action',
  },
  {
    id: '@model-bootstrap',
    pattern: /#modules\/[^'"]+\/infra\/models\//,
    reason: 'presentation layer must not construct or query Lucid models directly',
  },
  {
    id: '@write-repository',
    pattern: /#modules\/[^'"]+\/infra\/repositories\/write\//,
    reason: 'presentation layer must not call write repositories directly',
  },
  {
    id: '@mail-drive-side-effects',
    pattern: /#services\/mail|#services\/drive/,
    reason: 'presentation layer must not trigger external side effects directly',
  },
]

function fail(message) {
  console.error(`[side-effect-gate][ERROR] ${message}`)
  process.exit(1)
}

function enumerateFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...enumerateFiles(file))
    } else if (entry.isFile()) {
      files.push(file)
    }
  }
  return files
}

let files = []
try {
  files = TARGETS.flatMap((target) => enumerateFiles(target))
    .filter((file) => controllerOrRoutePattern.test(file))
    .map((file) => file.split(path.sep).join('/'))
} catch (error) {
  fail(
    `Unable to enumerate controller/route files: ${error instanceof Error ? error.message : String(error)}`
  )
}

const violations = []

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  const runtimeContent = content
    .replace(/^\s*import\s+type\s.+$/gm, '')
    .replace(/^\s*export\s+type\s.+$/gm, '')
  for (const matcher of forbiddenMatchers) {
    if (!matcher.pattern.test(runtimeContent)) continue
    if (allowList.has(`${file}:${matcher.id}`)) continue

    violations.push({
      file,
      rule: matcher.id,
      reason: matcher.reason,
    })
  }
}

if (violations.length > 0) {
  const details = violations
    .map((violation) => `${violation.file} -> ${violation.rule} (${violation.reason})`)
    .join('\n')
  fail(`Detected direct side-effect boundary violations:\n${details}`)
}

console.log(`[side-effect-gate][OK] Checked ${files.length} controller/route files`)
console.log('[side-effect-gate] PASSED')
