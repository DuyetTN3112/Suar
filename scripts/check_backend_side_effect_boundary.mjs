#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const TARGETS = ['app/modules', 'start/routes']
const controllerOrRoutePattern = /(\/controllers\/.*\.ts$|^start\/routes\/.*\.ts$)/

const allowList = new Set([
  'start/routes/auth.ts:@model-bootstrap',
  'start/routes/testing.ts:@cache-runtime',
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

let files = []
try {
  const output = execFileSync('rg', ['--files', ...TARGETS], { encoding: 'utf8' })
  files = output
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter((file) => controllerOrRoutePattern.test(file))
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
