import { createHash } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { sourceFiles } from '@adonisjs/lucid/utils'

import {
  parseMigrationChecksumManifest,
  reconcileMigrationLedger,
  type ChecksumManifestState,
  type MigrationLedgerRow,
  type MigrationSourceFile,
  type SchemaDumpState,
} from '#database/migration_ledger_contract'

type SchemaDumpManifestValue = {
  version?: unknown
  connection?: unknown
  dumpPath?: unknown
  schemaTableName?: unknown
  schemaVersionsTableName?: unknown
  baselineApproval?: unknown
  squashedMigrationNames?: unknown
}

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isIsoTimestamp = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value))

async function loadChecksumManifest(path: string): Promise<ChecksumManifestState> {
  if (!(await fileExists(path))) {
    return { status: 'missing' }
  }

  try {
    return parseMigrationChecksumManifest(JSON.parse(await readFile(path, 'utf8')))
  } catch {
    return { status: 'invalid', reason: 'checksum manifest is not valid JSON' }
  }
}

async function loadSchemaDump(input: {
  sqlPath: string
  manifestPath: string
  projectRoot: string
  dumpName: string
  connection: string
  schemaTableName: string
  schemaVersionsTableName: string
}): Promise<SchemaDumpState> {
  const [hasSql, hasManifest] = await Promise.all([
    fileExists(input.sqlPath),
    fileExists(input.manifestPath),
  ])

  if (!hasSql && !hasManifest) {
    return { status: 'absent' }
  }
  if (!hasSql || !hasManifest) {
    return {
      status: 'invalid',
      reason: 'schema dump SQL and sidecar manifest must both exist',
    }
  }

  let value: SchemaDumpManifestValue
  try {
    value = JSON.parse(await readFile(input.manifestPath, 'utf8')) as SchemaDumpManifestValue
  } catch {
    return { status: 'invalid', reason: 'schema dump sidecar manifest is not valid JSON' }
  }

  const names = value.squashedMigrationNames
  const baselineApproval =
    value.baselineApproval !== null &&
    typeof value.baselineApproval === 'object' &&
    !Array.isArray(value.baselineApproval)
      ? (value.baselineApproval as Record<string, unknown>)
      : null
  const declaredDumpPath =
    typeof value.dumpPath === 'string' ? resolve(input.projectRoot, value.dumpPath) : null
  const expectedDumpPath = resolve(input.sqlPath)
  const declaredRelativePath =
    declaredDumpPath === null ? null : relative(input.projectRoot, declaredDumpPath)
  const contextMatches =
    value.version === 1 &&
    value.connection === input.connection &&
    value.schemaTableName === input.schemaTableName &&
    value.schemaVersionsTableName === input.schemaVersionsTableName &&
    declaredDumpPath === expectedDumpPath &&
    declaredRelativePath !== null &&
    declaredRelativePath.length > 0 &&
    !declaredRelativePath.startsWith('..') &&
    Array.isArray(names) &&
    names.every((name) => typeof name === 'string')

  if (!contextMatches) {
    return {
      status: 'invalid',
      reason: 'schema dump sidecar does not match the active connection and ledger context',
    }
  }

  const approvalStatus = baselineApproval?.['status']
  if (approvalStatus !== 'candidate' && approvalStatus !== 'approved') {
    return {
      status: 'invalid',
      reason: 'schema dump sidecar must declare a candidate or approved baseline',
    }
  }
  if (
    approvalStatus === 'approved' &&
    (!isNonEmptyString(baselineApproval?.['changeId']) ||
      !isNonEmptyString(baselineApproval?.['databaseOwner']) ||
      !isNonEmptyString(baselineApproval?.['releaseOwner']) ||
      !isIsoTimestamp(baselineApproval?.['approvedAt']))
  ) {
    return {
      status: 'invalid',
      reason: 'approved schema dump baseline has incomplete change-control evidence',
    }
  }

  return {
    status: 'valid',
    dumpName: input.dumpName,
    sha256: createHash('sha256')
      .update(await readFile(input.sqlPath))
      .digest('hex'),
    approvalStatus,
    squashedMigrationNames: names as string[],
  }
}

export default class MigrationLedgerVerifyCommand extends BaseCommand {
  static override commandName = 'migration:ledger-verify'
  static override description =
    'Read-only release gate for pending, corrupt, squashed, and modified migrations'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({
    description: 'Database connection to verify',
    alias: 'c',
  })
  declare connection?: string

  @flags.boolean({
    description: 'Print the complete machine-readable report',
  })
  declare json: boolean

  override async run(): Promise<void> {
    let stage = 'boot'
    try {
      stage = 'resolve_database'
      const db = await this.app.container.make('lucid.db')
      const connection = this.connection ?? db.primaryConnectionName

      if (!db.manager.has(connection)) {
        this.logger.error('Unknown database connection')
        this.exitCode = 1
        return
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(connection)) {
        this.logger.error(
          'Configured database connection name is unsafe for schema dump resolution'
        )
        this.exitCode = 1
        return
      }

      const rawConnection = db.getRawConnection(connection)
      if (rawConnection === undefined) {
        this.logger.error(`Database connection is not configured: ${connection}`)
        this.exitCode = 1
        return
      }

      const rawConfig = rawConnection.config
      const migrationConfig = rawConfig.migrations ?? {}
      const schemaTableName = migrationConfig.tableName ?? 'adonis_schema'
      const schemaVersionsTableName = `${schemaTableName}_versions`
      const client = db.connection(connection)
      stage = 'read_ledger'
      const ledgerTablePresent = await client.schema.hasTable(schemaTableName)
      const ledgerRows = ledgerTablePresent
        ? ((await client
            .query()
            .from(schemaTableName)
            .select('name', 'batch')) as MigrationLedgerRow[])
        : []

      const migrationPaths = migrationConfig.paths?.length
        ? migrationConfig.paths
        : ['database/migrations']
      stage = 'read_migration_sources'
      const collected = (
        await Promise.all(
          migrationPaths.map((path) =>
            sourceFiles(this.app.appRoot, path, migrationConfig.naturalSort ?? false)
          )
        )
      ).flatMap(({ files }) => files)
      const migrations: MigrationSourceFile[] = await Promise.all(
        collected.map(async (file) => ({
          name: file.name,
          sha256: createHash('sha256')
            .update(await readFile(file.absPath))
            .digest('hex'),
        }))
      )

      const checksumManifest = await loadChecksumManifest(
        this.app.makePath('database/migration-checksums.json')
      )
      const dumpName = `database/schema/${connection}-schema.sql`
      const sqlPath = this.app.makePath(dumpName)
      stage = 'read_schema_dump'
      const schemaDump = await loadSchemaDump({
        sqlPath,
        manifestPath: this.app.makePath(`database/schema/${connection}-schema.meta.json`),
        projectRoot: this.app.makePath('.'),
        dumpName,
        connection,
        schemaTableName,
        schemaVersionsTableName,
      })

      const report = reconcileMigrationLedger({
        ledgerTablePresent,
        ledgerRows,
        sourceFiles: migrations,
        checksumManifest,
        schemaDump,
      })

      if (this.json) {
        this.logger.info(JSON.stringify(report))
      } else {
        this.logger.info(
          `Migration ledger: completed=${report.counts.completed} pending=${report.counts.pending} corrupt=${report.counts.corrupt} squashed=${report.counts.squashed}`
        )
        for (const issue of report.issues) {
          this.logger.error(
            `[${issue.code}]${issue.migration ? ` ${issue.migration}:` : ''} ${issue.detail}`
          )
        }
      }

      if (!report.releaseReady) {
        this.exitCode = 2
        return
      }
      this.logger.success('Migration ledger release gate passed')
    } catch {
      this.logger.error(
        `Migration ledger verification failed before a report could be produced (stage=${stage})`
      )
      this.exitCode = 1
    }
  }
}
