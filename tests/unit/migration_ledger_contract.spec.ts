import { spawnSync } from 'node:child_process'

import { test } from '@japa/runner'

import {
  canonicalizeMigrationName,
  parseMigrationChecksumManifest,
  reconcileMigrationLedger,
  type MigrationChecksumManifest,
} from '#database/migration_ledger_contract'

const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)

function manifest(migrations: Record<string, string>): {
  status: 'valid'
  manifest: MigrationChecksumManifest
} {
  return {
    status: 'valid',
    manifest: {
      version: 1,
      algorithm: 'sha256',
      migrations,
      schemaDumps: {},
    },
  }
}

test.group('Migration ledger release contract', () => {
  test('passes only when ledger, sources, and immutable checksums agree', ({ assert }) => {
    const report = reconcileMigrationLedger({
      ledgerTablePresent: true,
      ledgerRows: [{ name: 'database/migrations/20260701000000_create_alpha', batch: 1 }],
      sourceFiles: [
        {
          name: 'database/migrations/20260701000000_create_alpha',
          sha256: HASH_A,
        },
      ],
      checksumManifest: manifest({
        'database/migrations/20260701000000_create_alpha': HASH_A,
      }),
      schemaDump: { status: 'absent' },
    })

    assert.isTrue(report.releaseReady)
    assert.deepEqual(report.counts, { completed: 1, pending: 0, corrupt: 0, squashed: 0 })
    assert.isEmpty(report.issues)
  })

  test('blocks pending, corrupt, missing manifest, and checksum drift with stable codes', ({
    assert,
  }) => {
    const report = reconcileMigrationLedger({
      ledgerTablePresent: true,
      ledgerRows: [{ name: 'database/migrations/20260601000000_missing', batch: 1 }],
      sourceFiles: [
        {
          name: 'database/migrations/20260701000000_pending',
          sha256: HASH_B,
        },
      ],
      checksumManifest: { status: 'missing' },
      schemaDump: { status: 'absent' },
    })

    assert.isFalse(report.releaseReady)
    assert.sameMembers(
      report.issues.map(({ code }) => code),
      ['pending_migration', 'corrupt_migration', 'checksum_manifest_missing']
    )
  })

  test('accepts a missing source only from a validated schema-dump baseline', ({ assert }) => {
    const name = 'database/migrations/20260601000000_squashed'
    const report = reconcileMigrationLedger({
      ledgerTablePresent: true,
      ledgerRows: [{ name, batch: 1 }],
      sourceFiles: [],
      checksumManifest: {
        status: 'valid',
        manifest: {
          version: 1,
          algorithm: 'sha256',
          migrations: { [name]: HASH_A },
          schemaDumps: { 'database/schema/pg-schema.sql': HASH_B },
        },
      },
      schemaDump: {
        status: 'valid',
        dumpName: 'database/schema/pg-schema.sql',
        sha256: HASH_B,
        approvalStatus: 'approved',
        squashedMigrationNames: [name],
      },
    })

    assert.isTrue(report.releaseReady)
    assert.deepEqual(report.counts, { completed: 0, pending: 0, corrupt: 0, squashed: 1 })
  })

  test('does not reject distinct migrations that share a timestamp prefix', ({ assert }) => {
    const first = 'database/migrations/20260723240000_add_trigger'
    const second = 'database/migrations/20260723240000_create_errors'
    const report = reconcileMigrationLedger({
      ledgerTablePresent: true,
      ledgerRows: [
        { name: first, batch: 1 },
        { name: second, batch: 1 },
      ],
      sourceFiles: [
        { name: first, sha256: HASH_A },
        { name: second, sha256: HASH_B },
      ],
      checksumManifest: manifest({ [first]: HASH_A, [second]: HASH_B }),
      schemaDump: { status: 'absent' },
    })

    assert.isTrue(report.releaseReady)
  })

  test('validates checksum manifest shape before reconciliation', ({ assert }) => {
    assert.deepEqual(parseMigrationChecksumManifest(undefined), {
      status: 'invalid',
      reason: 'manifest root must be an object',
    })
    assert.deepEqual(
      parseMigrationChecksumManifest({
        version: 1,
        algorithm: 'sha256',
        migrations: { migration: 'not-a-checksum' },
      }),
      {
        status: 'invalid',
        reason: 'manifest contains an invalid, duplicate, or unsafe migration checksum entry',
      }
    )
  })

  test('canonicalizes supported aliases and detects duplicates after normalization', ({
    assert,
  }) => {
    assert.equal(
      canonicalizeMigrationName('.\\database\\migrations\\20260701000000_alpha.ts'),
      'database/migrations/20260701000000_alpha'
    )

    const report = reconcileMigrationLedger({
      ledgerTablePresent: true,
      ledgerRows: [
        { name: './database/migrations/20260701000000_alpha.ts', batch: 1 },
        { name: 'database\\migrations\\20260701000000_alpha.js', batch: 1 },
      ],
      sourceFiles: [{ name: 'database/migrations/20260701000000_alpha.mjs', sha256: HASH_A }],
      checksumManifest: manifest({
        'database/migrations/20260701000000_alpha.cjs': HASH_A,
      }),
      schemaDump: { status: 'absent' },
    })

    assert.include(
      report.issues.map(({ code }) => code),
      'duplicate_ledger_name'
    )
    assert.notInclude(
      report.issues.map(({ code }) => code),
      'pending_migration'
    )
  })

  test('rejects unsafe names without returning the untrusted value in diagnostics', ({
    assert,
  }) => {
    const secretLikeName = '../password=do-not-log'
    const report = reconcileMigrationLedger({
      ledgerTablePresent: true,
      ledgerRows: [{ name: secretLikeName, batch: 1 }],
      sourceFiles: [{ name: '/absolute/migration.ts', sha256: HASH_A }],
      checksumManifest: manifest({}),
      schemaDump: { status: 'absent' },
    })

    assert.sameMembers(
      report.issues.map(({ code }) => code),
      ['invalid_ledger_name', 'invalid_source_name']
    )
    assert.notInclude(JSON.stringify(report), secretLikeName)
    assert.isNull(canonicalizeMigrationName('database/migrations/../secret.ts'))
    assert.isNull(canonicalizeMigrationName('database/migrations/bad\u0000name.ts'))
    assert.isNull(canonicalizeMigrationName(''))
  })

  test('sorts diagnostics deterministically regardless of input order', ({ assert }) => {
    const sourceFiles = [
      { name: 'database/migrations/20260702000000_beta', sha256: HASH_B },
      { name: 'database/migrations/20260701000000_alpha', sha256: HASH_A },
    ]
    const input = {
      ledgerTablePresent: true,
      ledgerRows: [] as { name: string; batch: number }[],
      checksumManifest: manifest({}),
      schemaDump: { status: 'absent' as const },
    }

    const forward = reconcileMigrationLedger({ ...input, sourceFiles })
    const reversed = reconcileMigrationLedger({ ...input, sourceFiles: [...sourceFiles].reverse() })

    assert.deepEqual(forward.issues, reversed.issues)
  })

  test('blocks untracked, changed, and orphaned schema dump checksums', ({ assert }) => {
    const dumpName = 'database/schema/pg-schema.sql'
    const base = {
      ledgerTablePresent: true,
      ledgerRows: [] as { name: string; batch: number }[],
      sourceFiles: [] as { name: string; sha256: string }[],
      schemaDump: {
        status: 'valid' as const,
        dumpName,
        sha256: HASH_A,
        approvalStatus: 'approved' as const,
        squashedMigrationNames: [],
      },
    }

    assert.include(
      reconcileMigrationLedger({
        ...base,
        checksumManifest: manifest({}),
      }).issues.map(({ code }) => code),
      'schema_dump_checksum_untracked'
    )
    assert.include(
      reconcileMigrationLedger({
        ...base,
        checksumManifest: {
          status: 'valid',
          manifest: {
            version: 1,
            algorithm: 'sha256',
            migrations: {},
            schemaDumps: { [dumpName]: HASH_B },
          },
        },
      }).issues.map(({ code }) => code),
      'schema_dump_checksum_mismatch'
    )
    assert.include(
      reconcileMigrationLedger({
        ...base,
        schemaDump: { status: 'absent' },
        checksumManifest: {
          status: 'valid',
          manifest: {
            version: 1,
            algorithm: 'sha256',
            migrations: {},
            schemaDumps: { [dumpName]: HASH_A },
          },
        },
      }).issues.map(({ code }) => code),
      'schema_dump_checksum_orphan'
    )
  })

  test('counts a reproducible candidate baseline but blocks release until approval', ({
    assert,
  }) => {
    const name = 'database/migrations/20260601000000_squashed'
    const report = reconcileMigrationLedger({
      ledgerTablePresent: true,
      ledgerRows: [{ name, batch: 1 }],
      sourceFiles: [],
      checksumManifest: {
        status: 'valid',
        manifest: {
          version: 1,
          algorithm: 'sha256',
          migrations: {},
          schemaDumps: { 'database/schema/pg-schema.sql': HASH_A },
        },
      },
      schemaDump: {
        status: 'valid',
        dumpName: 'database/schema/pg-schema.sql',
        sha256: HASH_A,
        approvalStatus: 'candidate',
        squashedMigrationNames: [name],
      },
    })

    assert.isFalse(report.releaseReady)
    assert.deepEqual(report.counts, { completed: 0, pending: 0, corrupt: 0, squashed: 1 })
    assert.deepEqual(
      report.issues.map(({ code }) => code),
      ['schema_dump_approval_required']
    )
  })

  test('command returns an operational exit without echoing an untrusted connection flag', ({
    assert,
  }) => {
    const untrustedConnection = 'missing-password=do-not-log'
    const result = spawnSync(
      process.execPath,
      ['ace', 'migration:ledger-verify', `--connection=${untrustedConnection}`],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: process.env,
      }
    )
    const output = `${result.stdout}\n${result.stderr}`

    assert.equal(result.status, 1)
    assert.include(output, 'Unknown database connection')
    assert.notInclude(output, untrustedConnection)
    assert.notInclude(output, 'node_modules')
    assert.notInclude(output, 'password=')
  })
})
