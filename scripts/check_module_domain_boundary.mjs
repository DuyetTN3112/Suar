#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { enumerateTypeScriptFiles, scanTypeScriptImports } from './architecture/import_scanner.mjs'

const TARGETS = ['app/modules', 'app/infra', 'start']
const EXCLUDED_SEGMENTS = ['/tests/']
const ALLOWED_CROSS_MODULE_LAYERS = new Set(['public_contracts'])
const START_ALLOWED_TARGET_LAYERS = new Set([
  'bootstrap',
  'controllers',
  'exceptions',
  'health_checks',
  'listeners',
  'middleware',
])
const ALLOWLIST_PATH = new URL('./module_boundary_runtime_allowlist.json', import.meta.url)
const BASELINE_PATH = new URL(
  '../docs/architecture/generated/module_boundary_runtime_baseline.json',
  import.meta.url
)

function fail(message) {
  console.error(`[module-boundary][ERROR] ${message}`)
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
    fail('Runtime allowlist must be a JSON array of exact "file -> specifier" strings')
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
    fail('Runtime baseline must be an array of { file, import_path, reason } objects')
  }
}

function isCompositionImport(reference) {
  if (reference.file.startsWith('app/composition/')) {
    return true
  }

  if (!reference.file.startsWith('start/')) {
    return false
  }

  return (
    START_ALLOWED_TARGET_LAYERS.has(reference.targetLayer) ||
    reference.targetTail?.startsWith('actions/listeners/')
  )
}

function isSharedHttpBoundaryImport(reference) {
  return reference.targetModule === 'http' && reference.targetLayer === 'boundary'
}

function violationReason(reference) {
  if (
    reference.file.startsWith('app/modules/') &&
    reference.specifier.startsWith('#composition/')
  ) {
    return 'feature module imports outer composition; dependency injection must point inward'
  }

  if (reference.file.startsWith('app/infra/')) {
    return 'platform infrastructure must not depend on feature modules'
  }

  if (reference.sourceModule === reference.targetModule && reference.targetLayer === 'bootstrap') {
    return 'application action imports bootstrap; composition must point inward to the action'
  }

  if (reference.resolution === 'relative') {
    return 'relative cross-module import bypasses an explicit public surface'
  }

  if (reference.targetLayer === 'application/ports') {
    return 'cross-module port is provider-owned; the consumer must own its required port'
  }

  return `cross-module import targets internal layer ${reference.targetLayer ?? '(unknown)'}`
}

function collectViolations() {
  return scanTypeScriptImports(TARGETS, {
    excludedSegments: EXCLUDED_SEGMENTS,
  })
    .filter((reference) => {
      if (
        reference.file.startsWith('app/modules/') &&
        reference.specifier.startsWith('#composition/')
      ) {
        return true
      }

      if (reference.targetModule === null) {
        return false
      }

      if (reference.file.startsWith('app/infra/')) {
        return true
      }

      if (reference.sourceModule === reference.targetModule) {
        return reference.file.includes('/actions/') && reference.targetLayer === 'bootstrap'
      }

      return (
        !ALLOWED_CROSS_MODULE_LAYERS.has(reference.targetLayer) &&
        !isSharedHttpBoundaryImport(reference) &&
        !isCompositionImport(reference)
      )
    })
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
    `[module-boundary] Wrote ${baseline.length} tracked violations to ${BASELINE_PATH.pathname}`
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

const violations = collectViolations()
if (process.argv.includes('--write-baseline')) {
  writeBaseline(violations)
  process.exit(0)
}

if (!existsSync(BASELINE_PATH)) {
  fail(
    `Runtime baseline is missing at ${BASELINE_PATH.pathname}. Review current violations, then run this script with --write-baseline.`
  )
}

const allowlist = loadJson(ALLOWLIST_PATH, 'runtime allowlist')
const baseline = loadJson(BASELINE_PATH, 'runtime baseline')
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
    `Detected ${newViolations.length} new runtime cross-module imports. Use a consumer-owned port or a thin provider public contract:\n${formatEntries(
      newViolations
    )}`
  )
}

if (staleBaseline.length > 0) {
  fail(
    `Detected ${staleBaseline.length} stale runtime baseline entries. Regenerate the baseline so resolved debt cannot return:\n${formatEntries(
      staleBaseline
    )}`
  )
}

if (staleAllowlist.length > 0) {
  fail(
    `Detected ${staleAllowlist.length} stale runtime allowlist entries. Remove them:\n${staleAllowlist.join(
      '\n'
    )}`
  )
}

const checkedFiles = enumerateTypeScriptFiles(TARGETS, {
  excludedSegments: EXCLUDED_SEGMENTS,
})
console.log(`[module-boundary][OK] Checked ${checkedFiles.length} TypeScript files`)
console.log(`[module-boundary][OK] Tracked transitional violations: ${baseline.length}`)
console.log(`[module-boundary][OK] Intentional allowlist entries: ${allowlist.length}`)
console.log('[module-boundary] PASSED')
