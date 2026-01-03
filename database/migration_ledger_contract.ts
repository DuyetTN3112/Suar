export const MIGRATION_CHECKSUM_MANIFEST_VERSION = 1

export type MigrationLedgerRow = {
  name: string
  batch: number
}

export type MigrationSourceFile = {
  name: string
  sha256: string
}

export type MigrationChecksumManifest = {
  version: typeof MIGRATION_CHECKSUM_MANIFEST_VERSION
  algorithm: 'sha256'
  migrations: Record<string, string>
  schemaDumps: Record<string, string>
}

export type ChecksumManifestState =
  | { status: 'valid'; manifest: MigrationChecksumManifest }
  | { status: 'missing' }
  | { status: 'invalid'; reason: string }

export type SchemaDumpState =
  | { status: 'absent' }
  | { status: 'invalid'; reason: string }
  | {
      status: 'valid'
      dumpName: string
      sha256: string
      approvalStatus: 'candidate' | 'approved'
      squashedMigrationNames: string[]
    }

export type MigrationLedgerIssueCode =
  | 'ledger_table_missing'
  | 'duplicate_ledger_name'
  | 'duplicate_source_name'
  | 'invalid_ledger_name'
  | 'invalid_source_name'
  | 'pending_migration'
  | 'corrupt_migration'
  | 'checksum_manifest_missing'
  | 'checksum_manifest_invalid'
  | 'migration_checksum_untracked'
  | 'migration_checksum_mismatch'
  | 'checksum_manifest_orphan'
  | 'schema_dump_invalid'
  | 'schema_dump_unknown_migration'
  | 'schema_dump_checksum_untracked'
  | 'schema_dump_checksum_mismatch'
  | 'schema_dump_checksum_orphan'
  | 'schema_dump_approval_required'

export type MigrationLedgerIssue = {
  code: MigrationLedgerIssueCode
  migration?: string
  detail: string
}

export type MigrationLedgerReport = {
  releaseReady: boolean
  counts: {
    completed: number
    pending: number
    corrupt: number
    squashed: number
  }
  issues: MigrationLedgerIssue[]
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/
const SCRIPT_EXTENSION_PATTERN = /\.(?:[cm]?[jt]s)$/

function canonicalizeRelativePath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || CONTROL_CHARACTER_PATTERN.test(value)) {
    return null
  }
  if (value.trim() !== value) {
    return null
  }

  let normalized = value.replaceAll('\\', '/')
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2)
  }
  if (normalized.length === 0 || normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) {
    return null
  }

  const segments = normalized.split('/')
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    return null
  }

  return segments.join('/')
}

export function canonicalizeMigrationName(value: unknown): string | null {
  const path = canonicalizeRelativePath(value)
  if (path === null) {
    return null
  }

  const normalized = path.replace(SCRIPT_EXTENSION_PATTERN, '')
  return normalized.length === 0 ? null : normalized
}

function duplicateNames(names: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const name of names) {
    if (seen.has(name)) {
      duplicates.add(name)
    }
    seen.add(name)
  }

  return [...duplicates].sort()
}

function addIssue(
  issues: MigrationLedgerIssue[],
  code: MigrationLedgerIssueCode,
  detail: string,
  migration?: string
): void {
  issues.push({
    code,
    detail,
    ...(migration === undefined ? {} : { migration }),
  })
}

export function parseMigrationChecksumManifest(value: unknown): ChecksumManifestState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'invalid', reason: 'manifest root must be an object' }
  }

  const candidate = value as Record<string, unknown>
  if (candidate['version'] !== MIGRATION_CHECKSUM_MANIFEST_VERSION) {
    return {
      status: 'invalid',
      reason: `manifest version must be ${MIGRATION_CHECKSUM_MANIFEST_VERSION}`,
    }
  }
  if (candidate['algorithm'] !== 'sha256') {
    return { status: 'invalid', reason: 'manifest algorithm must be sha256' }
  }

  const migrations = candidate['migrations']
  if (migrations === null || typeof migrations !== 'object' || Array.isArray(migrations)) {
    return { status: 'invalid', reason: 'manifest migrations must be an object' }
  }

  const canonicalMigrations: Record<string, string> = {}
  for (const [name, checksum] of Object.entries(migrations)) {
    const canonicalName = canonicalizeMigrationName(name)
    if (
      canonicalName === null ||
      Object.hasOwn(canonicalMigrations, canonicalName) ||
      typeof checksum !== 'string' ||
      !SHA256_PATTERN.test(checksum)
    ) {
      return {
        status: 'invalid',
        reason: 'manifest contains an invalid, duplicate, or unsafe migration checksum entry',
      }
    }
    canonicalMigrations[canonicalName] = checksum
  }

  const schemaDumps = candidate['schemaDumps'] ?? {}
  if (schemaDumps === null || typeof schemaDumps !== 'object' || Array.isArray(schemaDumps)) {
    return { status: 'invalid', reason: 'manifest schemaDumps must be an object when provided' }
  }

  const canonicalSchemaDumps: Record<string, string> = {}
  for (const [name, checksum] of Object.entries(schemaDumps)) {
    const canonicalName = canonicalizeRelativePath(name)
    if (
      canonicalName === null ||
      Object.hasOwn(canonicalSchemaDumps, canonicalName) ||
      typeof checksum !== 'string' ||
      !SHA256_PATTERN.test(checksum)
    ) {
      return {
        status: 'invalid',
        reason: 'manifest contains an invalid, duplicate, or unsafe schema dump checksum entry',
      }
    }
    canonicalSchemaDumps[canonicalName] = checksum
  }

  return {
    status: 'valid',
    manifest: {
      version: MIGRATION_CHECKSUM_MANIFEST_VERSION,
      algorithm: 'sha256',
      migrations: canonicalMigrations,
      schemaDumps: canonicalSchemaDumps,
    },
  }
}

export function reconcileMigrationLedger(input: {
  ledgerTablePresent: boolean
  ledgerRows: MigrationLedgerRow[]
  sourceFiles: MigrationSourceFile[]
  checksumManifest: ChecksumManifestState
  schemaDump: SchemaDumpState
}): MigrationLedgerReport {
  const issues: MigrationLedgerIssue[] = []
  const ledgerNames = input.ledgerRows.flatMap(({ name }) => {
    const canonicalName = canonicalizeMigrationName(name)
    if (canonicalName === null) {
      addIssue(
        issues,
        'invalid_ledger_name',
        'ledger contains an empty, absolute, traversing, or control-character migration name'
      )
      return []
    }
    return [canonicalName]
  })
  const normalizedSourceFiles = input.sourceFiles.flatMap((file) => {
    const canonicalName = canonicalizeMigrationName(file.name)
    if (canonicalName === null) {
      addIssue(
        issues,
        'invalid_source_name',
        'source inventory contains an empty, absolute, traversing, or control-character name'
      )
      return []
    }
    return [{ ...file, name: canonicalName }]
  })
  const sourceNames = normalizedSourceFiles.map(({ name }) => name)
  const ledgerNameSet = new Set(ledgerNames)
  const sourceNameSet = new Set(sourceNames)

  if (!input.ledgerTablePresent) {
    addIssue(
      issues,
      'ledger_table_missing',
      'migration ledger table does not exist; run migrations before release verification'
    )
  }

  for (const name of duplicateNames(ledgerNames)) {
    addIssue(
      issues,
      'duplicate_ledger_name',
      'migration appears more than once in the ledger',
      name
    )
  }
  for (const name of duplicateNames(sourceNames)) {
    addIssue(
      issues,
      'duplicate_source_name',
      'multiple migration source files resolve to the same logical name',
      name
    )
  }

  let squashedNames = new Set<string>()
  if (input.schemaDump.status === 'invalid') {
    addIssue(issues, 'schema_dump_invalid', input.schemaDump.reason)
  } else if (input.schemaDump.status === 'valid') {
    if (input.schemaDump.approvalStatus !== 'approved') {
      addIssue(
        issues,
        'schema_dump_approval_required',
        'schema dump baseline is reproducible but still requires database-owner and release-owner approval'
      )
    }
    const normalizedSquashedNames = input.schemaDump.squashedMigrationNames.flatMap((name) => {
      const canonicalName = canonicalizeMigrationName(name)
      if (canonicalName === null) {
        addIssue(
          issues,
          'schema_dump_invalid',
          'schema dump manifest contains an unsafe migration name'
        )
        return []
      }
      return [canonicalName]
    })
    squashedNames = new Set(normalizedSquashedNames)
    for (const name of squashedNames) {
      if (!ledgerNameSet.has(name)) {
        addIssue(
          issues,
          'schema_dump_unknown_migration',
          'schema dump declares a migration that is absent from the ledger',
          name
        )
      }
    }
  }

  let completed = 0
  let pending = 0
  let corrupt = 0
  let squashed = 0

  for (const name of sourceNameSet) {
    if (ledgerNameSet.has(name)) {
      completed += 1
    } else {
      pending += 1
      addIssue(
        issues,
        'pending_migration',
        'migration source file is not recorded in the ledger',
        name
      )
    }
  }

  for (const name of ledgerNameSet) {
    if (sourceNameSet.has(name)) {
      continue
    }
    if (squashedNames.has(name)) {
      squashed += 1
      continue
    }
    corrupt += 1
    addIssue(issues, 'corrupt_migration', 'ledger migration is missing on the filesystem', name)
  }

  if (input.checksumManifest.status === 'missing') {
    addIssue(
      issues,
      'checksum_manifest_missing',
      'source-controlled database/migration-checksums.json is required'
    )
  } else if (input.checksumManifest.status === 'invalid') {
    addIssue(issues, 'checksum_manifest_invalid', input.checksumManifest.reason)
  } else {
    const manifestEntries = input.checksumManifest.manifest.migrations
    const sourceByName = new Map(normalizedSourceFiles.map((file) => [file.name, file]))

    for (const [name, file] of sourceByName) {
      const expected = manifestEntries[name]
      if (expected === undefined) {
        addIssue(
          issues,
          'migration_checksum_untracked',
          'migration has no checksum manifest entry',
          name
        )
      } else if (expected !== file.sha256) {
        addIssue(
          issues,
          'migration_checksum_mismatch',
          'migration content differs from its immutable checksum',
          name
        )
      }
    }

    for (const name of Object.keys(manifestEntries)) {
      if (!sourceByName.has(name) && !squashedNames.has(name)) {
        addIssue(
          issues,
          'checksum_manifest_orphan',
          'checksum manifest entry has no source file or validated schema-dump baseline',
          name
        )
      }
    }

    const schemaDumpEntries = input.checksumManifest.manifest.schemaDumps
    if (input.schemaDump.status === 'valid') {
      const dumpName = canonicalizeRelativePath(input.schemaDump.dumpName)
      if (dumpName === null) {
        addIssue(issues, 'schema_dump_invalid', 'schema dump path is unsafe')
      } else {
        const expected = schemaDumpEntries[dumpName]
        if (expected === undefined) {
          addIssue(
            issues,
            'schema_dump_checksum_untracked',
            'validated schema dump has no immutable checksum entry'
          )
        } else if (expected !== input.schemaDump.sha256) {
          addIssue(
            issues,
            'schema_dump_checksum_mismatch',
            'schema dump content differs from its immutable checksum'
          )
        }
      }
    }
    for (const name of Object.keys(schemaDumpEntries)) {
      if (
        input.schemaDump.status !== 'valid' ||
        canonicalizeRelativePath(input.schemaDump.dumpName) !== name
      ) {
        addIssue(
          issues,
          'schema_dump_checksum_orphan',
          'schema dump checksum has no validated SQL dump and matching sidecar manifest'
        )
      }
    }
  }

  issues.sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      (left.migration ?? '').localeCompare(right.migration ?? '') ||
      left.detail.localeCompare(right.detail)
  )

  return {
    releaseReady: issues.length === 0,
    counts: {
      completed,
      pending,
      corrupt,
      squashed,
    },
    issues,
  }
}
