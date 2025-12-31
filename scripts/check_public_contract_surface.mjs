#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const SURFACE_GLOBS = ['app/modules/**/public_contracts/*.ts', 'app/modules/**/boundary/*.ts']
const BLOCKED_SEGMENTS = ['/actions/', '/infra/', '/services/', '/bootstrap/']
const ALLOWLIST_PATH = new URL('./public_contract_surface_allowlist.json', import.meta.url)

function fail(message) {
  console.error(`[public-contract-surface][ERROR] ${message}`)
  process.exit(1)
}

function loadAllowlist() {
  try {
    const parsed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
    if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string')) {
      fail('Allowlist must be a JSON array of strings')
    }
    return parsed
  } catch (error) {
    fail(
      `Unable to read allowlist at ${ALLOWLIST_PATH.pathname}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

let files = []
try {
  const output = execFileSync('bash', ['-lc', `find app/modules \\( -path '*/public_contracts/*.ts' -o -path '*/boundary/*.ts' \\)`], {
    encoding: 'utf8',
  })
  files = output.trim().split('\n').filter(Boolean)
} catch (error) {
  fail(`Unable to enumerate contract surface files: ${error instanceof Error ? error.message : String(error)}`)
}

const allowlist = loadAllowlist()
const exportPattern = /^export .* from '([^']+)'/gm
const violations = []
const usedAllowlistEntries = new Set()

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(exportPattern)) {
    const importPath = match[1]
    if (!importPath.startsWith('#modules/')) continue
    if (!BLOCKED_SEGMENTS.some((segment) => importPath.includes(segment))) continue

    const key = `${file} -> ${importPath}`
    if (allowlist.includes(key)) {
      usedAllowlistEntries.add(key)
      continue
    }

    violations.push(key)
  }
}

if (violations.length > 0) {
  fail(
    `Detected public contract surfaces re-exporting internal module implementation. Add a narrow wrapper or make debt explicit in allowlist:\n${violations.join(
      '\n'
    )}`
  )
}

const staleAllowlistEntries = allowlist.filter((entry) => !usedAllowlistEntries.has(entry))
if (staleAllowlistEntries.length > 0) {
  fail(
    `Detected stale public contract allowlist entries. Remove them:\n${staleAllowlistEntries.join(
      '\n'
    )}`
  )
}

console.log(`[public-contract-surface][OK] Checked ${files.length} contract surface files`)
console.log(
  `[public-contract-surface][OK] Allowlisted transitional re-exports: ${allowlist.length}`
)
console.log('[public-contract-surface] PASSED')
