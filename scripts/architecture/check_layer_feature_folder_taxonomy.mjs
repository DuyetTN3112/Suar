#!/usr/bin/env node

import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const REPOSITORY_ROOT = process.cwd()
const SCAN_ROOTS = ['app/modules', 'app/composition']
const STRUCTURAL_NAMES = new Set([
  'actions',
  'adapters',
  'api_v1',
  'backend',
  'boundary',
  'bootstrap',
  'commands',
  'constants',
  'controllers',
  'domain',
  'dtos',
  'events',
  'exceptions',
  'factories',
  'health_checks',
  'inbound',
  'infra',
  'internal',
  'listeners',
  'mapper',
  'mappers',
  'middleware',
  'models',
  'observability',
  'outbound',
  'public_contracts',
  'queries',
  'read',
  'repositories',
  'request',
  'response',
  'support',
  'tests',
  'types',
  'unit',
  'integration',
  'contract',
  'validators',
  'v1',
  'write',
])
const FEATURE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const STRICT = process.argv.includes('--strict')

async function directories(path) {
  const entries = await readdir(path, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory())
}

async function walk(path, featurePaths) {
  for (const entry of await directories(path)) {
    const child = join(path, entry.name)
    const parts = relative(REPOSITORY_ROOT, child).split('/')
    // Legacy modules already contain many owner-specific nested directories. The first ratchet
    // covers newly introduced compound feature names; single-word legacy folders are left to the
    // module inventory and are not reclassified by this check.
    if (!STRUCTURAL_NAMES.has(entry.name) && entry.name.includes('-') && parts.length >= 4) {
      featurePaths.push(relative(REPOSITORY_ROOT, child))
    }
    await walk(child, featurePaths)
  }
}

const featurePaths = []
for (const scanRoot of SCAN_ROOTS) {
  await walk(join(REPOSITORY_ROOT, scanRoot), featurePaths)
}

const invalid = featurePaths.filter((path) => {
  const name = path.split('/').at(-1)
  return name === undefined || !FEATURE_NAME.test(name)
})

console.log(`[feature-folder-taxonomy] discovered ${featurePaths.length} feature directories`)
for (const path of featurePaths.sort()) console.log(`[feature-folder-taxonomy][OK] ${path}`)

if (invalid.length > 0) {
  for (const path of invalid) {
    console.error(`[feature-folder-taxonomy][ERROR] feature folder must use kebab-case: ${path}`)
  }
  if (STRICT) process.exit(1)
  console.error('[feature-folder-taxonomy] report-only mode: existing findings do not fail the check')
}
