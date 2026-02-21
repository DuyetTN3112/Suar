import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { test } from '@japa/runner'

import {
  databaseResetConfirmation,
  isDeclaredTestDatabase,
  serializeDatabaseFingerprint,
  verifyExactBackup,
  type DatabaseFingerprint,
} from '../../app/seed/safety/seed_data_safety.js'

const FINGERPRINT: DatabaseFingerprint = {
  databaseName: 'suar',
  databaseUser: 'suar_owner',
  serverAddress: '127.0.0.1',
  serverPort: 5432,
}

test.group('Seed data safety', () => {
  test('ties the exact reset confirmation to the complete runtime fingerprint', ({ assert }) => {
    const confirmation = databaseResetConfirmation(FINGERPRINT)
    const differentPortConfirmation = databaseResetConfirmation({
      ...FINGERPRINT,
      serverPort: 5433,
    })

    assert.match(confirmation, /^RESET_SUAR_DATABASE:suar:[A-F0-9]{24}$/)
    assert.notEqual(confirmation, differentPortConfirmation)
    assert.equal(
      serializeDatabaseFingerprint(FINGERPRINT),
      'database=suar;user=suar_owner;host=127.0.0.1;port=5432'
    )
  })

  test('recognizes a test target only by exact configured database name', ({ assert }) => {
    const testFingerprint = { ...FINGERPRINT, databaseName: 'suar_test' }

    assert.isTrue(isDeclaredTestDatabase(testFingerprint, 'suar_test'))
    assert.isFalse(isDeclaredTestDatabase(FINGERPRINT, 'suar'))
    assert.isFalse(isDeclaredTestDatabase(FINGERPRINT, 'suar_test'))
    assert.isFalse(isDeclaredTestDatabase(FINGERPRINT, undefined))
    assert.isFalse(isDeclaredTestDatabase(FINGERPRINT, ''))
  })

  test('accepts only a recent restore-verified custom dump for the runtime fingerprint', async ({
    assert,
  }) => {
    const directory = await mkdtemp(join(tmpdir(), 'suar-seed-safety-'))
    const backupPath = join(directory, 'suar.dump')
    const manifestPath = join(directory, 'suar.dump.manifest.json')
    const backup = Buffer.from('PGDMP exact test backup bytes')
    const backupSha256 = createHash('sha256').update(backup).digest('hex')
    const now = new Date('2026-07-31T02:00:00.000Z')

    try {
      await writeFile(backupPath, backup)
      await writeFile(
        manifestPath,
        JSON.stringify({
          version: 1,
          kind: 'suar-postgres-exact-backup',
          scope: 'schema-and-data',
          format: 'postgresql-custom',
          databaseFingerprint: serializeDatabaseFingerprint(FINGERPRINT),
          backupSha256,
          createdAt: '2026-07-31T01:00:00.000Z',
          restoreVerifiedAt: '2026-07-31T01:30:00.000Z',
          restoreVerification: 'passed',
        })
      )

      const result = await verifyExactBackup({
        backupPath,
        manifestPath,
        fingerprint: FINGERPRINT,
        now,
      })

      assert.equal(result.sha256, backupSha256)
      assert.equal(result.backupPath, backupPath)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('rejects a backup manifest for a different database fingerprint', async ({ assert }) => {
    const directory = await mkdtemp(join(tmpdir(), 'suar-seed-safety-'))
    const backupPath = join(directory, 'suar.dump')
    const manifestPath = join(directory, 'suar.dump.manifest.json')
    const backup = Buffer.from('PGDMP exact test backup bytes')

    try {
      await writeFile(backupPath, backup)
      await writeFile(
        manifestPath,
        JSON.stringify({
          version: 1,
          kind: 'suar-postgres-exact-backup',
          scope: 'schema-and-data',
          format: 'postgresql-custom',
          databaseFingerprint: serializeDatabaseFingerprint({
            ...FINGERPRINT,
            databaseName: 'another_database',
          }),
          backupSha256: createHash('sha256').update(backup).digest('hex'),
          createdAt: '2026-07-31T01:00:00.000Z',
          restoreVerifiedAt: '2026-07-31T01:30:00.000Z',
          restoreVerification: 'passed',
        })
      )

      await assert.rejects(
        () =>
          verifyExactBackup({
            backupPath,
            manifestPath,
            fingerprint: FINGERPRINT,
            now: new Date('2026-07-31T02:00:00.000Z'),
          }),
        /database fingerprint does not match/
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
