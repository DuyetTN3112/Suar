import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import RedisCacheStore from '../app/modules/cache/infra/redis_cache_store.js'
import {
  findMatchingProficiencyLevel,
  toLegacyProficiencyBandCode,
} from '../app/modules/skills/public_contracts/proficiency_level_mapping.js'
import {
  seedOperationalEvents,
  logSummary,
} from '../app/seed/demo_data/operational_event_seeder.js'
import {
  seedOrganizations,
  seedOrganizationMemberships,
  updateCurrentOrganizations,
} from '../app/seed/demo_data/organization_seeder.js'
import { createPostgresBackup } from '../app/seed/demo_data/postgres_backup.js'
import { seedProfileAggregates } from '../app/seed/demo_data/profile_seed.js'
import { seedProjectAttachments } from '../app/seed/demo_data/project_attachment_seeder.js'
import { seedProjects, seedProjectMembers } from '../app/seed/demo_data/project_seeder.js'
import { seedReviewData } from '../app/seed/demo_data/review_data_seeder.js'
import { seedReviewDisputeDossiers } from '../app/seed/demo_data/review_dispute_dossier_seeder.js'
import { assertSeedIntegrity } from '../app/seed/demo_data/seed_integrity.js'
import type { SeedRuntime } from '../app/seed/demo_data/seed_runtime.js'
import { applyWhere, findRow, resetPostgres } from '../app/seed/demo_data/seed_utils.js'
import {
  seedSkills,
  seedProfessionalRoleTemplates,
  seedProjectSkillCatalog,
  seedProjectProfessionalRoles,
} from '../app/seed/demo_data/skill_seeder.js'
import { seedSprints, seedSprintReviewDisputes } from '../app/seed/demo_data/sprint_seeder.js'
import { seedTaskReviewWorkflows } from '../app/seed/demo_data/task_review_workflow_seeder.js'
import {
  seedTasks,
  seedTaskAssignments,
  seedTaskApplications,
  seedTaskRequiredSkills,
} from '../app/seed/demo_data/task_seeder.js'
import { getSeededTaskSpecs } from '../app/seed/demo_data/task_specs.js'
import { seedTaskStatuses } from '../app/seed/demo_data/task_status_seeder.js'
import { seedTaskSubmissions } from '../app/seed/demo_data/task_submission_seeder.js'
import type { SeedContext, SeedRow, SeedWhereValue } from '../app/seed/demo_data/types.js'
import { seedUsers, seedUserOAuthProviders } from '../app/seed/demo_data/user_seeder.js'
import { PRESERVED_MAIN_USER_EMAILS } from '../app/seed/demo_data/user_seeds_specs.js'
import { seedUserSkills } from '../app/seed/demo_data/user_skill_seeder.js'
import { seedUserSubscriptions } from '../app/seed/demo_data/user_subscription_seeder.js'
import {
  databaseResetConfirmation,
  isDeclaredTestDatabase,
  serializeDatabaseFingerprint,
  verifyExactBackup,
  type DatabaseFingerprint,
} from '../app/seed/safety/seed_data_safety.js'

type SeedQuery = ReturnType<TransactionClientContract['from']>

interface RawRowsResult {
  rows: unknown[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRawRows(value: unknown): unknown[] {
  return isRecord(value) && Array.isArray(value['rows'])
    ? (value as unknown as RawRowsResult).rows
    : []
}

export default class SeedData extends BaseCommand implements SeedRuntime {
  static override commandName = 'seed:data'
  static override description = 'Seed deterministic local demo data for admin/org/user flows'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Delete all existing seedable data before inserting the demo set' })
  declare fresh: boolean

  @flags.boolean({ description: 'Include generated dense dashboard filler tasks' })
  declare dense: boolean

  @flags.boolean({
    description: 'Execute the complete fresh seed transaction and always roll it back',
  })
  declare dryRun: boolean

  @flags.string({
    description: 'Exact runtime database reset token required for every non-test target',
  })
  declare confirmDatabase?: string

  @flags.string({
    description: 'Absolute path to a restore-verified exact pg_dump custom-format backup',
  })
  declare verifiedBackup?: string

  @flags.string({
    description: 'Absolute path to the restore-verification manifest for --verified-backup',
  })
  declare backupManifest?: string

  private seedCompleted = false

  uuid(): string {
    return randomUUID()
  }

  isoDaysAgo(daysAgo: number, hour = 9): string {
    const value = new Date()
    value.setDate(value.getDate() - daysAgo)
    value.setHours(hour, 0, 0, 0)
    return value.toISOString()
  }

  isoDaysAhead(daysAhead: number, hour = 17): string {
    const value = new Date()
    value.setDate(value.getDate() + daysAhead)
    value.setHours(hour, 0, 0, 0)
    return value.toISOString()
  }

  seedPullRequestUrl(seedKey: string): string {
    return `https://github.com/suar-labs/trust-review-workbench/pull/${encodeURIComponent(seedKey)}`
  }

  toJson(value: unknown): string {
    return JSON.stringify(value)
  }

  readNonEmptyString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.length > 0 ? value : fallback
  }

  toRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
    return {}
  }

  parseJsonRecord(value: string): Record<string, unknown> {
    const parsed: unknown = JSON.parse(value)
    return this.toRecord(parsed)
  }

  requireValue<T>(value: T | undefined, label: string): T {
    if (value === undefined) {
      throw new Error(`Missing seeded value for ${label}`)
    }
    return value
  }

  findRow<T extends SeedRow = SeedRow>(
    trx: TransactionClientContract,
    table: string,
    where: Record<string, SeedWhereValue>
  ): Promise<T | null> {
    return findRow<T>(trx, table, where)
  }

  applyWhere(query: SeedQuery, where: Record<string, SeedWhereValue>): SeedQuery {
    return applyWhere(query, where)
  }

  private installPostCommitShutdownGuard(): void {
    process.once('uncaughtException', (error) => {
      const isLatePgShutdown =
        this.seedCompleted &&
        error instanceof Error &&
        error.message === 'Connection terminated' &&
        error.stack?.includes('/node_modules/.pnpm/pg@')

      if (isLatePgShutdown) {
        process.exit(0)
      }

      this.logger.error(
        `Seed command crashed: ${error instanceof Error ? error.message : String(error)}`
      )
      process.exit(1)
    })
  }

  private async loadDatabaseFingerprint(): Promise<DatabaseFingerprint> {
    const result = (await db.rawQuery(`
      SELECT
        current_database()::text AS database_name,
        current_user::text AS database_user,
        COALESCE(inet_server_addr()::text, 'local-socket') AS server_address,
        inet_server_port()::integer AS server_port
    `)) as unknown
    const row = readRawRows(result)[0]
    if (!isRecord(row)) {
      throw new Error('Unable to resolve the runtime PostgreSQL database fingerprint')
    }

    const databaseName = row['database_name']
    const databaseUser = row['database_user']
    const serverAddress = row['server_address']
    const serverPort = row['server_port']
    if (
      typeof databaseName !== 'string' ||
      databaseName.length === 0 ||
      typeof databaseUser !== 'string' ||
      databaseUser.length === 0 ||
      typeof serverAddress !== 'string' ||
      serverAddress.length === 0 ||
      typeof serverPort !== 'number' ||
      !Number.isInteger(serverPort) ||
      serverPort <= 0
    ) {
      throw new Error('Runtime PostgreSQL database returned an invalid fingerprint')
    }

    return { databaseName, databaseUser, serverAddress, serverPort }
  }

  private async assertSeedTargetSafety(fingerprint: DatabaseFingerprint): Promise<void> {
    const isTestDatabase = isDeclaredTestDatabase(fingerprint, process.env['PG_TEST_DATABASE'])
    if (isTestDatabase) {
      this.logger.info(
        `Confirmed configured test database target: ${serializeDatabaseFingerprint(fingerprint)}`
      )
      return
    }

    const requiredConfirmation = databaseResetConfirmation(fingerprint)
    if (this.confirmDatabase !== requiredConfirmation) {
      throw new Error(
        `Non-test database requires exact --confirm-database="${requiredConfirmation}" for runtime fingerprint ${serializeDatabaseFingerprint(fingerprint)}`
      )
    }

    if (this.dryRun) {
      this.logger.warning(
        `Confirmed non-test dry-run target: ${serializeDatabaseFingerprint(fingerprint)}`
      )
      return
    }

    if (!this.verifiedBackup || !this.backupManifest) {
      throw new Error(
        'Non-test database writes require --verified-backup and --backup-manifest absolute paths'
      )
    }

    const verified = await verifyExactBackup({
      backupPath: this.verifiedBackup,
      manifestPath: this.backupManifest,
      fingerprint,
    })
    this.logger.success(
      `Verified exact restore-tested backup before reset: ${verified.backupPath} (sha256:${verified.sha256.slice(0, 12)}...)`
    )
  }

  override async run() {
    this.installPostCommitShutdownGuard()
    this.logger.info('Starting deterministic seed for admin/org/user demo data...')

    if (!this.dryRun && !this.fresh) {
      throw new Error('Seed writes are append-disabled; re-run with --fresh or use --dry-run')
    }

    const fingerprint = await this.loadDatabaseFingerprint()
    await this.assertSeedTargetSafety(fingerprint)

    const denseSeed = this.dense || process.env['SEED_DENSE_DEMO'] === 'true'
    const taskSpecs = getSeededTaskSpecs({ dense: denseSeed })
    if (denseSeed) {
      this.logger.info('Dense demo task seed enabled.')
    }

    let context!: SeedContext

    if (this.fresh && !this.dryRun) {
      const backupPath = await createPostgresBackup({ logger: this.logger })
      this.logger.success(`PostgreSQL backup created before reset: ${backupPath}`)
    }

    const trx = await db.transaction()
    try {
      if (this.fresh || this.dryRun) {
        this.logger.warning('Clearing PostgreSQL seed scope...')
        await resetPostgres(trx, PRESERVED_MAIN_USER_EMAILS)
      }

      const skills = await seedSkills(this, trx)

      const dbLevels = (await trx
        .from('proficiency_levels')
        .select('id', 'code', 'display_name', 'short_name')) as {
        id: string
        code: string
        display_name: string | null
        short_name: string | null
      }[]
      const levelMap: Record<string, string> = {}
      for (const level of dbLevels) {
        levelMap[level.code] = level.id
      }
      for (const level of dbLevels) {
        const legacyBandCode = toLegacyProficiencyBandCode(level.code, 'junior')
        levelMap[legacyBandCode] =
          levelMap[legacyBandCode] ??
          findMatchingProficiencyLevel(dbLevels, legacyBandCode)?.id ??
          level.id
      }
      await seedProfessionalRoleTemplates(this, trx, skills, levelMap)
      const users = await seedUsers(this, trx)
      await seedUserOAuthProviders(this, trx, users)
      const organizations = await seedOrganizations(this, trx, users)
      await seedOrganizationMemberships(this, trx, users, organizations)
      const projects = await seedProjects(this, trx, users, organizations)
      const projectSkills = await seedProjectSkillCatalog(this, trx, users, projects, skills)
      await seedProjectProfessionalRoles(this, trx, users, projects, projectSkills, levelMap)
      await seedProjectMembers(this, trx, users, projects)
      const statuses = await seedTaskStatuses(this, trx, organizations)
      const tasks = await seedTasks(this, trx, users, projects, organizations, statuses, taskSpecs)
      const assignments = await seedTaskAssignments(this, trx, users, tasks, taskSpecs)
      Object.assign(assignments, await seedTaskApplications(this, trx, users, tasks))
      await seedTaskRequiredSkills(this, trx, tasks, skills, taskSpecs)
      const submissions = await seedTaskSubmissions(this, trx, users, tasks, assignments, taskSpecs)
      const sprints = await seedSprints(this, trx, users, projects, tasks)
      await seedReviewData(this, trx, users, tasks, assignments, skills, organizations)
      await seedUserSkills(this, trx, users, skills)
      await seedUserSubscriptions(this, trx, users)
      await seedProjectAttachments(this, trx, users, projects)
      await updateCurrentOrganizations(this, trx, users, organizations)

      context = {
        users,
        organizations,
        projects,
        skills,
        tasks,
        assignments,
        submissions,
        sprints,
        snapshots: {},
      }

      context = await seedProfileAggregates(this, context, trx)
      await seedReviewDisputeDossiers(this, trx, users, tasks, assignments)
      await seedSprintReviewDisputes(this, trx, context)
      await seedTaskReviewWorkflows(this, trx, context)
      await seedOperationalEvents(this, context, trx)
      await assertSeedIntegrity(trx, context, taskSpecs)

      if (!this.dryRun) {
        await trx.commit()
      }
    } finally {
      if (!trx.isCompleted) {
        await trx.rollback()
      }
    }

    if (this.dryRun) {
      this.logger.success(
        'Dry run completed successfully; the full PostgreSQL seed transaction was rolled back.'
      )
      return
    }

    await RedisCacheStore.flush()
    this.logger.info('Cleared the dedicated application cache after seed commit.')
    await logSummary(context)
    this.seedCompleted = true
    this.logger.success('Seed data inserted successfully.')
  }
}
