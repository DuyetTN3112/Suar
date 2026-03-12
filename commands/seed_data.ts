import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { seedMongo, logSummary } from '../app/seed/demo_data/mongo_seed.js'
import {
  seedOrganizations,
  seedOrganizationMemberships,
  updateCurrentOrganizations,
} from '../app/seed/demo_data/organization_seeder.js'
import { seedProfileAggregates } from '../app/seed/demo_data/profile_seed.js'
import { seedProjectAttachments } from '../app/seed/demo_data/project_attachment_seeder.js'
import { seedProjects, seedProjectMembers } from '../app/seed/demo_data/project_seeder.js'
import { seedReviewData } from '../app/seed/demo_data/review_data_seeder.js'
import type { SeedRuntime } from '../app/seed/demo_data/seed_runtime.js'
import {
  applyWhere,
  findRow,
  resetPostgres,
  resetMongo,
  ensureMongoConnection,
  closeSeedConnections,
} from '../app/seed/demo_data/seed_utils.js'
import { seedSkills } from '../app/seed/demo_data/skill_seeder.js'
import {
  seedTasks,
  seedTaskAssignments,
  seedTaskApplications,
  seedTaskRequiredSkills,
} from '../app/seed/demo_data/task_seeder.js'
import { seedTaskStatuses } from '../app/seed/demo_data/task_status_seeder.js'
import type {
  SeedContext,
  SeedRow,
  SeedWhereValue,
} from '../app/seed/demo_data/types.js'
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
    return `https://github.com/suar/demo/pull/${seedKey}`
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

  applyWhere(
    query: SeedQuery,
    where: Record<string, SeedWhereValue>
  ): SeedQuery {
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

    let context!: SeedContext

    await db.transaction(async (trx) => {
      if (this.fresh) {
        this.logger.warning('Clearing PostgreSQL seed scope...')
        await resetPostgres(trx)
      }

      const skills = await seedSkills(this, trx)
      const users = await seedUsers(this, trx)
      await seedUserOAuthProviders(this, trx, users)
      const organizations = await seedOrganizations(this, trx, users)
      await seedOrganizationMemberships(this, trx, users, organizations)
      const projects = await seedProjects(this, trx, users, organizations)
      await seedProjectMembers(this, trx, users, projects)
      const statuses = await seedTaskStatuses(this, trx, organizations)
      const tasks = await seedTasks(this, trx, users, projects, organizations, statuses)
      const assignments = await seedTaskAssignments(this, trx, users, tasks)
      await seedTaskApplications(this, trx, users, tasks)
      await seedTaskRequiredSkills(this, trx, tasks, skills)
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
        snapshots: {},
      }
    })

    await ensureMongoConnection()

    if (this.fresh) {
      this.logger.warning('Clearing MongoDB seed scope...')
      await resetMongo()
    }

    context = await seedProfileAggregates(this, context)
    await seedMongo(this, context)
    await logSummary(context)

    this.seedCompleted = true
    this.logger.success('Seed data inserted successfully.')
    await closeSeedConnections()
  }
}
