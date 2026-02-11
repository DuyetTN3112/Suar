#!/usr/bin/env node

import { basename } from 'node:path'

import { enumerateTypeScriptFiles } from './architecture/import_scanner.mjs'

const files = enumerateTypeScriptFiles(['app/modules'])
const violations = []

for (const file of files) {
  if (file.includes('/application/ports/')) {
    violations.push({
      file,
      reason: 'legacy application/ports taxonomy is forbidden; actions is the application layer',
    })
    continue
  }

  if (!file.includes('/actions/ports/')) {
    continue
  }

  if (!file.includes('/actions/ports/inbound/') && !file.includes('/actions/ports/outbound/')) {
    violations.push({
      file,
      reason: 'port must be classified as inbound or outbound',
    })
  }

  if (/_impl\.ts$/u.test(basename(file))) {
    violations.push({
      file,
      reason: 'concrete implementation must not live in a port folder',
    })
  }
}

if (violations.length > 0) {
  const details = violations
    .map(({ file, reason }) => `${file}: ${reason}`)
    .join('\n')
  console.error(`[port-taxonomy][ERROR] Detected ${violations.length} violation(s):\n${details}`)
  process.exit(1)
}

const portFiles = files.filter((file) => file.includes('/actions/ports/'))
console.log(`[port-taxonomy][OK] Checked ${portFiles.length} port files`)
console.log('[port-taxonomy] PASSED')
