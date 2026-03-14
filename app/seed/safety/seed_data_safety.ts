import { createHash, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, open, readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'

export const EXACT_BACKUP_MANIFEST_KIND = 'suar-postgres-exact-backup'
export const EXACT_BACKUP_MANIFEST_VERSION = 1
export const EXACT_BACKUP_MAX_AGE_MILLISECONDS = 24 * 60 * 60 * 1_000

export interface DatabaseFingerprint {
  databaseName: string
  databaseUser: string
  serverAddress: string
  serverPort: number
}

export interface VerifyExactBackupInput {
  backupPath: string
  manifestPath: string
  fingerprint: DatabaseFingerprint
  now?: Date
}

export interface VerifiedExactBackup {
  backupPath: string
  manifestPath: string
  sha256: string
}

interface ExactBackupManifest {
  version: number
  kind: string
  scope: string
  format: string
  databaseFingerprint: string
  backupSha256: string
  createdAt: string
  restoreVerifiedAt: string
  restoreVerification: string
}

function encodeFingerprintPart(value: string): string {
  return encodeURIComponent(value)
}

export function serializeDatabaseFingerprint(fingerprint: DatabaseFingerprint): string {
  return [
    `database=${encodeFingerprintPart(fingerprint.databaseName)}`,
    `user=${encodeFingerprintPart(fingerprint.databaseUser)}`,
    `host=${encodeFingerprintPart(fingerprint.serverAddress)}`,
    `port=${fingerprint.serverPort}`,
  ].join(';')
}

export function databaseResetConfirmation(fingerprint: DatabaseFingerprint): string {
  const digest = createHash('sha256')
    .update(serializeDatabaseFingerprint(fingerprint))
    .digest('hex')
    .slice(0, 24)
    .toUpperCase()

  return `RESET_SUAR_DATABASE:${fingerprint.databaseName}:${digest}`
}

export function isDeclaredTestDatabase(
  fingerprint: DatabaseFingerprint,
  configuredTestDatabase: string | undefined
): boolean {
  const testDatabase = configuredTestDatabase?.trim()
  const hasExplicitTestName =
    fingerprint.databaseName === 'test' ||
    fingerprint.databaseName.startsWith('test_') ||
    fingerprint.databaseName.endsWith('_test') ||
    fingerprint.databaseName.endsWith('_testing')

  return Boolean(testDatabase && hasExplicitTestName && fingerprint.databaseName === testDatabase)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseManifest(value: unknown): ExactBackupManifest {
  if (!isRecord(value)) {
    throw new Error('Exact backup manifest root must be an object')
  }

  const manifest: ExactBackupManifest = {
    version: typeof value['version'] === 'number' ? value['version'] : Number.NaN,
    kind: typeof value['kind'] === 'string' ? value['kind'] : '',
    scope: typeof value['scope'] === 'string' ? value['scope'] : '',
    format: typeof value['format'] === 'string' ? value['format'] : '',
    databaseFingerprint:
      typeof value['databaseFingerprint'] === 'string' ? value['databaseFingerprint'] : '',
    backupSha256: typeof value['backupSha256'] === 'string' ? value['backupSha256'] : '',
    createdAt: typeof value['createdAt'] === 'string' ? value['createdAt'] : '',
    restoreVerifiedAt:
      typeof value['restoreVerifiedAt'] === 'string' ? value['restoreVerifiedAt'] : '',
    restoreVerification:
      typeof value['restoreVerification'] === 'string' ? value['restoreVerification'] : '',
  }

  if (
    manifest.version !== EXACT_BACKUP_MANIFEST_VERSION ||
    manifest.kind !== EXACT_BACKUP_MANIFEST_KIND ||
    manifest.scope !== 'schema-and-data' ||
    manifest.format !== 'postgresql-custom' ||
    manifest.restoreVerification !== 'passed'
  ) {
    throw new Error(
      'Exact backup manifest must identify a restore-verified PostgreSQL custom schema-and-data dump'
    )
  }

  if (!/^[a-f0-9]{64}$/.test(manifest.backupSha256)) {
    throw new Error('Exact backup manifest contains an invalid SHA-256 checksum')
  }

  return manifest
}

function parseManifestTimestamp(value: string, label: string): number {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Exact backup manifest ${label} must be an ISO timestamp`)
  }
  return timestamp
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  const input = createReadStream(path)
  for await (const chunk of input) {
    hash.update(chunk as Buffer)
  }
  return hash.digest('hex')
}

async function readBackupHeader(path: string): Promise<Buffer> {
  const handle = await open(path, 'r')
  try {
    const header = Buffer.alloc(5)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    return header.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

function checksumsMatch(actual: string, expected: string): boolean {
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

export async function verifyExactBackup(
  input: VerifyExactBackupInput
): Promise<VerifiedExactBackup> {
  if (!isAbsolute(input.backupPath) || !isAbsolute(input.manifestPath)) {
    throw new Error('Exact backup and manifest paths must both be absolute')
  }

  const [backupStats, manifestStats] = await Promise.all([
    lstat(input.backupPath),
    lstat(input.manifestPath),
  ])

  if (
    !backupStats.isFile() ||
    backupStats.isSymbolicLink() ||
    backupStats.size <= 5 ||
    !manifestStats.isFile() ||
    manifestStats.isSymbolicLink() ||
    manifestStats.size <= 0 ||
    manifestStats.size > 64 * 1_024
  ) {
    throw new Error('Exact backup and manifest must be non-empty regular files, not symbolic links')
  }

  const [header, manifestJson] = await Promise.all([
    readBackupHeader(input.backupPath),
    readFile(input.manifestPath, 'utf8'),
  ])
  if (!header.equals(Buffer.from('PGDMP'))) {
    throw new Error('Exact backup must use PostgreSQL custom format (pg_dump --format=custom)')
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(manifestJson)
  } catch {
    throw new Error('Exact backup manifest must contain valid JSON')
  }
  const manifest = parseManifest(parsedJson)

  const expectedFingerprint = serializeDatabaseFingerprint(input.fingerprint)
  if (manifest.databaseFingerprint !== expectedFingerprint) {
    throw new Error(
      'Exact backup manifest database fingerprint does not match the runtime database'
    )
  }

  const now = (input.now ?? new Date()).getTime()
  const createdAt = parseManifestTimestamp(manifest.createdAt, 'createdAt')
  const restoreVerifiedAt = parseManifestTimestamp(manifest.restoreVerifiedAt, 'restoreVerifiedAt')
  const clockSkewAllowance = 5 * 60 * 1_000
  if (
    createdAt > now + clockSkewAllowance ||
    restoreVerifiedAt < createdAt ||
    restoreVerifiedAt > now + clockSkewAllowance ||
    now - createdAt > EXACT_BACKUP_MAX_AGE_MILLISECONDS
  ) {
    throw new Error(
      'Exact backup must be created within 24 hours and restore-verified after its creation'
    )
  }

  const actualSha256 = await sha256File(input.backupPath)
  if (!checksumsMatch(actualSha256, manifest.backupSha256)) {
    throw new Error('Exact backup checksum does not match its restore-verification manifest')
  }

  return {
    backupPath: input.backupPath,
    manifestPath: input.manifestPath,
    sha256: actualSha256,
  }
}
