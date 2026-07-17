#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const TARGETS = ['app/modules', 'start']
const FILE_GLOBS = ['*.ts']
const EXCLUDED_SEGMENTS = ['/tests/', '/README.md']
const BLOCKED_SEGMENTS = ['/actions/', '/controllers/', '/infra/', '/domain/', '/support/']
const ALLOWED_CROSS_MODULE_SEGMENTS = ['/public_contracts/', '/application/ports/']
const ALLOWLIST_PATH = new URL('./module_boundary_runtime_allowlist.json', import.meta.url)

function fail(message) {
  console.error(`[module-boundary][ERROR] ${message}`)
  process.exit(1)
}

function getOwningModule(file) {
  return file.startsWith('app/modules/') ? file.split('/')[2] : 'start'
}

function loadAllowlist() {
  try {
    return JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
  } catch (error) {
    fail(
      `Unable to read runtime allowlist at ${ALLOWLIST_PATH.pathname}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

function isAllowedCrossModuleImport(importPath, owner, importedModule, allowlist) {
  if (owner === importedModule) return true
  if (ALLOWED_CROSS_MODULE_SEGMENTS.some((segment) => importPath.includes(segment))) return true
  return allowlist.includes(`${owner} -> ${importPath}`)
}

function validateAllowlistShape(allowlist) {
  if (!Array.isArray(allowlist) || !allowlist.every((entry) => typeof entry === 'string')) {
    fail('Runtime allowlist must be a JSON array of strings')
  }
}

let files = []
try {
  const output = execFileSync('rg', ['--files', ...TARGETS, '-g', ...FILE_GLOBS], {
    encoding: 'utf8',
  })
  files = output
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter((file) => !EXCLUDED_SEGMENTS.some((segment) => file.includes(segment)))
} catch (error) {
  fail(
    `Unable to enumerate TypeScript files: ${
      error instanceof Error ? error.message : String(error)
    }`
  )
}

const allowlist = loadAllowlist()
validateAllowlistShape(allowlist)
const importPattern = /from '#modules\/([^/]+)\/([^']+)'/g
const violations = []
const usedAllowlistEntries = new Set()

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const owner = getOwningModule(file)
  const imports = source.matchAll(importPattern)

  for (const match of imports) {
    const importedModule = match[1]
    const importTail = `/${match[2]}`
    const importPath = `#modules/${importedModule}/${match[2]}`

    const isBlockedSegment = BLOCKED_SEGMENTS.some((segment) => importTail.includes(segment))
    if (!isBlockedSegment) {
      continue
    }

    const allowlistKey = `${owner} -> ${importPath}`

    if (isAllowedCrossModuleImport(importPath, owner, importedModule, allowlist)) {
      if (allowlist.includes(allowlistKey)) {
        usedAllowlistEntries.add(allowlistKey)
      }
      continue
    }

    violations.push({
      file,
      owner,
      importPath,
    })
  }
}

if (violations.length > 0) {
  const details = violations
    .map((violation) => `${violation.file} -> imports ${violation.importPath} from ${violation.owner}`)
    .join('\n')
  fail(
    `Detected runtime cross-module internal imports. Use local application/ports or thin public_contracts instead:\n${details}`
  )
}

const staleAllowlistEntries = allowlist.filter((entry) => !usedAllowlistEntries.has(entry))
if (staleAllowlistEntries.length > 0) {
  fail(
    `Detected stale runtime allowlist entries. Remove them to keep boundary debt explicit:\n${staleAllowlistEntries.join(
      '\n'
    )}`
  )
}

console.log(`[module-boundary][OK] Checked ${files.length} TypeScript files`)
console.log(`[module-boundary][OK] Allowlisted transitional imports: ${allowlist.length}`)
console.log('[module-boundary] PASSED')
