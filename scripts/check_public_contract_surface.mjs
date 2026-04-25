#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { enumerateTypeScriptFiles, scanTypeScriptImports } from './architecture/import_scanner.mjs'

const MODULE_ROOTS = ['app/modules']
const EXCLUDED_SEGMENTS = ['/tests/']
const ALLOWLIST_PATH = new URL('./public_contract_surface_allowlist.json', import.meta.url)
const BASELINE_PATH = new URL(
  '../docs/architecture/generated/public_contract_surface_baseline.json',
  import.meta.url
)
const PUBLIC_CONTRACT_FORBIDDEN_PREFIXES = ['@adonisjs/', '#config/', '#database/']

function fail(message) {
  console.error(`[public-contract-surface][ERROR] ${message}`)
  process.exit(1)
}

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(
      `Unable to read ${label} at ${path.pathname}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

function validateAllowlistShape(allowlist) {
  if (!Array.isArray(allowlist) || !allowlist.every((entry) => typeof entry === 'string')) {
    fail('Surface allowlist must be a JSON array of exact "file -> specifier" strings')
  }
}

function validateBaselineShape(baseline) {
  if (
    !Array.isArray(baseline) ||
    !baseline.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.file === 'string' &&
        typeof entry.import_path === 'string' &&
        typeof entry.reason === 'string'
    )
  ) {
    fail('Surface baseline must be an array of { file, import_path, reason } objects')
  }
}

function isSurfaceFile(file) {
  return file.includes('/public_contracts/') || file.includes('/boundary/')
}

function isPublicContractFile(file) {
  return file.includes('/public_contracts/')
}

function isForbiddenReference(reference) {
  if (
    isPublicContractFile(reference.file) &&
    PUBLIC_CONTRACT_FORBIDDEN_PREFIXES.some((prefix) => reference.specifier.startsWith(prefix))
  ) {
    return true
  }

  if (reference.targetModule === null) {
    return false
  }

  if (reference.file.includes('/boundary/') && reference.targetLayer === 'boundary') {
    return false
  }

  return reference.targetLayer !== 'public_contracts'
}

function violationReason(reference) {
  if (PUBLIC_CONTRACT_FORBIDDEN_PREFIXES.some((prefix) => reference.specifier.startsWith(prefix))) {
    return 'public contract exposes framework, configuration, or persistence technology'
  }

  if (reference.resolution === 'relative') {
    return `surface uses a relative import into ${reference.targetLayer ?? '(unknown)'}`
  }

  return `surface imports internal layer ${reference.targetLayer ?? '(unknown)'}`
}

function collectViolations(surfaceFiles) {
  return scanTypeScriptImports(surfaceFiles)
    .filter(isForbiddenReference)
    .map((reference) => ({
      file: reference.file,
      import_path: reference.specifier,
      line: reference.line,
      reason: violationReason(reference),
    }))
    .sort(
      (left, right) =>
        left.file.localeCompare(right.file) ||
        left.line - right.line ||
        left.import_path.localeCompare(right.import_path)
    )
}

function violationKey(violation) {
  return `${violation.file} -> ${violation.import_path}`
}

function uniqueBaseline(violations) {
  const byKey = new Map()

  for (const violation of violations) {
    const key = violationKey(violation)
    if (!byKey.has(key)) {
      byKey.set(key, {
        file: violation.file,
        import_path: violation.import_path,
        reason: violation.reason,
      })
    }
  }

  return [...byKey.values()]
}

function writeBaseline(violations) {
  const baseline = uniqueBaseline(violations)
  mkdirSync(dirname(BASELINE_PATH.pathname), { recursive: true })
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`)
  console.log(
    `[public-contract-surface] Wrote ${baseline.length} tracked violations to ${BASELINE_PATH.pathname}`
  )
}

function formatEntries(entries, limit = 50) {
  const visible = entries.slice(0, limit)
  const lines = visible.map(
    (entry) => `${entry.file}:${entry.line ?? '?'} -> ${entry.import_path} (${entry.reason})`
  )

  if (entries.length > visible.length) {
    lines.push(`... ${entries.length - visible.length} additional violations omitted`)
  }

  return lines.join('\n')
}

const moduleFiles = enumerateTypeScriptFiles(MODULE_ROOTS, {
  excludedSegments: EXCLUDED_SEGMENTS,
})
const surfaceFiles = moduleFiles.filter(isSurfaceFile)
const violations = collectViolations(surfaceFiles)

if (process.argv.includes('--write-baseline')) {
  writeBaseline(violations)
  process.exit(0)
}

if (!existsSync(BASELINE_PATH)) {
  fail(
    `Surface baseline is missing at ${BASELINE_PATH.pathname}. Review current violations, then run this script with --write-baseline.`
  )
}

const allowlist = loadJson(ALLOWLIST_PATH, 'surface allowlist')
const baseline = loadJson(BASELINE_PATH, 'surface baseline')
validateAllowlistShape(allowlist)
validateBaselineShape(baseline)

const currentByKey = new Map(
  uniqueBaseline(violations).map((violation) => [violationKey(violation), violation])
)
const baselineKeys = new Set(baseline.map(violationKey))
const allowlistKeys = new Set(allowlist)

const newViolations = [...currentByKey.entries()]
  .filter(([key]) => !baselineKeys.has(key) && !allowlistKeys.has(key))
  .map(([, violation]) => violation)
const staleBaseline = baseline.filter((violation) => !currentByKey.has(violationKey(violation)))
const staleAllowlist = allowlist.filter((key) => !currentByKey.has(key))

if (newViolations.length > 0) {
  fail(
    `Detected ${newViolations.length} new impure public/boundary surface imports:\n${formatEntries(
      newViolations
    )}`
  )
}

if (staleBaseline.length > 0) {
  fail(
    `Detected ${staleBaseline.length} stale surface baseline entries. Regenerate the baseline so resolved debt cannot return:\n${formatEntries(
      staleBaseline
    )}`
  )
}

if (staleAllowlist.length > 0) {
  fail(
    `Detected ${staleAllowlist.length} stale surface allowlist entries. Remove them:\n${staleAllowlist.join(
      '\n'
    )}`
  )
}

console.log(`[public-contract-surface][OK] Checked ${surfaceFiles.length} contract surface files`)
console.log(`[public-contract-surface][OK] Tracked transitional violations: ${baseline.length}`)
console.log(`[public-contract-surface][OK] Intentional allowlist entries: ${allowlist.length}`)
console.log('[public-contract-surface] PASSED')
