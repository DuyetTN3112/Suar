import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  findMatchingProficiencyLevel,
  toLegacyProficiencyBandCode,
} from '../app/modules/skills/controllers/support/build_proficiency_framework_descriptor.js'
import { seedOperationalEvents, logSummary } from '../app/seed/demo_data/mongo_seed.js'
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
import {
  applyWhere,
  findRow,
  resetPostgres,
  closeSeedConnections,
} from '../app/seed/demo_data/seed_utils.js'
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
import { seedUserSkills } from '../app/seed/demo_data/user_skill_seeder.js'
import { seedUserSubscriptions } from '../app/seed/demo_data/user_subscription_seeder.js'

type SeedQuery = ReturnType<TransactionClientContract['from']>

export default class SeedData extends BaseCommand implements SeedRuntime {
  static override commandName = 'seed:data'
  static override description = 'Seed deterministic local demo data for admin/org/user flows'

  static override options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  @flags.boolean({ description: 'Delete all existing seedable data before inserting the demo set' })
  declare fresh: boolean

  @flags.boolean({ description: 'Include generated dense dashboard filler tasks' })
  declare dense: boolean

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

  private installShutdownErrorGuard(): void {
    process.once('uncaughtException', (error) => {
      if (
        this.seedCompleted &&
        error instanceof Error &&
        error.message.startsWith('Connection terminated')
      ) {
        this.logger.warning('Ignoring late PostgreSQL shutdown error after successful seed.')
        process.exit(0)
      }

      this.logger.error(
        `Seed command crashed: ${error instanceof Error ? error.message : String(error)}`
      )
      process.exit(1)
    })
  }

  override async run() {
    this.installShutdownErrorGuard()
    this.logger.info('Starting deterministic seed for admin/org/user demo data...')

    const denseSeed = this.dense || process.env['SEED_DENSE_DEMO'] === 'true'
    const taskSpecs = getSeededTaskSpecs({ dense: denseSeed })
    if (denseSeed) {
      this.logger.info('Dense demo task seed enabled.')
    }

    let context!: SeedContext

    if (this.fresh) {
      const backupPath = await createPostgresBackup({ logger: this.logger })
      this.logger.success(`PostgreSQL backup created before reset: ${backupPath}`)
    }

    await db.transaction(async (trx) => {
      if (this.fresh) {
        this.logger.warning('Clearing PostgreSQL seed scope...')
        await resetPostgres(trx)
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
      await seedReviewDisputeDossiers(this, trx, users, tasks, assignments)
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
    })

    context = await seedProfileAggregates(this, context)
    await db.transaction(async (trx) => {
      await seedSprintReviewDisputes(this, trx, context)
      await seedTaskReviewWorkflows(this, trx, context)
      await assertSeedIntegrity(trx, context, taskSpecs)
    })
    await seedOperationalEvents(this, context)
    await logSummary(context)

    this.seedCompleted = true
    this.logger.success('Seed data inserted successfully.')
    await closeSeedConnections()
  }
}
