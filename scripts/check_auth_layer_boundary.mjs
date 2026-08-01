#!/usr/bin/env node

import { existsSync } from 'node:fs'

import {
  enumerateTypeScriptFiles,
  scanTypeScriptImports,
} from './architecture/import_scanner.mjs'

const AUTH_ROOT = 'app/modules/auth'
const REQUIRED_DOMAIN_FILES = [
  `${AUTH_ROOT}/domain/auth_session_observation.ts`,
  `${AUTH_ROOT}/domain/landing_surface.ts`,
  `${AUTH_ROOT}/domain/session_access_policy.ts`,
  `${AUTH_ROOT}/domain/social_auth_provider.ts`,
  `${AUTH_ROOT}/domain/social_login_identity.ts`,
]
const roots = [
  `${AUTH_ROOT}/actions`,
  `${AUTH_ROOT}/controllers`,
  `${AUTH_ROOT}/domain`,
  `${AUTH_ROOT}/listeners`,
]
if (existsSync(`${AUTH_ROOT}/public_contracts`)) {
  roots.push(`${AUTH_ROOT}/public_contracts`)
}

const violations = []
const references = scanTypeScriptImports(roots, {
  excludedSegments: ['/tests/'],
})

for (const file of REQUIRED_DOMAIN_FILES) {
  if (!existsSync(file)) {
    violations.push({
      file,
      reason: 'required Auth-owned domain policy is missing',
    })
  }
}

function targetsAuthImplementation(reference) {
  return /^#modules\/auth\/(infra|controllers|middleware|listeners)(?:\/|$)/u.test(
    reference.specifier
  )
}

function targetsRuntimeTechnology(reference) {
  return (
    /^@adonisjs(?:\/|$)/u.test(reference.specifier) ||
    /^#(?:composition|config|database|start)(?:\/|$)/u.test(reference.specifier) ||
    /^(?:ioredis|redis)(?:\/|$)/u.test(reference.specifier)
  )
}

for (const reference of references) {
  if (reference.file.startsWith(`${AUTH_ROOT}/domain/`)) {
    if (
      targetsRuntimeTechnology(reference) ||
      /^#modules\/auth\/(actions|controllers|infra|listeners|middleware|observability)(?:\/|$)/u.test(
        reference.specifier
      )
    ) {
      violations.push({
        file: reference.file,
        reason: `domain imports outer/technical dependency ${reference.specifier}`,
      })
    }
    continue
  }

  if (reference.file.startsWith(`${AUTH_ROOT}/actions/`)) {
    if (targetsRuntimeTechnology(reference) || targetsAuthImplementation(reference)) {
      violations.push({
        file: reference.file,
        reason: `application layer imports implementation/technology ${reference.specifier}`,
      })
    }
    continue
  }

  if (reference.file.startsWith(`${AUTH_ROOT}/listeners/`)) {
    if (targetsRuntimeTechnology(reference) || targetsAuthImplementation(reference)) {
      violations.push({
        file: reference.file,
        reason: `listener owns implementation work instead of delegating ${reference.specifier}`,
      })
    }
    continue
  }

  if (reference.file.startsWith(`${AUTH_ROOT}/controllers/`)) {
    if (
      (targetsAuthImplementation(reference) &&
        !reference.specifier.startsWith('#modules/auth/controllers/ports/')) ||
      reference.specifier.startsWith('#composition/') ||
      /^#modules\/auth\/actions\/(?:ports\/outbound|services)(?:\/|$)/u.test(
        reference.specifier
      )
    ) {
      violations.push({
        file: reference.file,
        reason: `controller bypasses the Auth application boundary ${reference.specifier}`,
      })
    }
    continue
  }

  if (
    reference.file.startsWith(`${AUTH_ROOT}/public_contracts/`) &&
    (targetsRuntimeTechnology(reference) ||
      /^#modules\/auth\/(actions|controllers|domain|infra|listeners|middleware|observability)(?:\/|$)/u.test(
        reference.specifier
      ))
  ) {
    violations.push({
      file: reference.file,
      reason: `public contract exposes an Auth implementation ${reference.specifier}`,
    })
  }
}

if (violations.length > 0) {
  const details = violations
    .map(({ file, reason }) => `${file}: ${reason}`)
    .join('\n')
  console.error(
    `[auth-layer-boundary][ERROR] Detected ${violations.length} violation(s):\n${details}`
  )
  process.exit(1)
}

const checkedFiles = enumerateTypeScriptFiles(roots, {
  excludedSegments: ['/tests/'],
})
console.log(`[auth-layer-boundary][OK] Checked ${checkedFiles.length} Auth files`)
console.log(`[auth-layer-boundary][OK] Required domain policies: ${REQUIRED_DOMAIN_FILES.length}`)
console.log('[auth-layer-boundary] PASSED')
