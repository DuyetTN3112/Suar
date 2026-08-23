import db from '@adonisjs/lucid/services/db'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  TaxonomyMigrationRepository,
  TaxonomyMigrationRun,
  TaxonomyMigrationRunStatus,
} from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_migration_repository'
import type { TaxonomyMigrationPlan } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'

type DbClient = typeof db

function clientFor(transaction?: object): DbClient {
  return (transaction ?? db) as DbClient
}

function toRun(row: Record<string, unknown>): TaxonomyMigrationRun {
  return {
    id: String(row['id']),
    plan: (typeof row['plan_payload'] === 'string'
      ? JSON.parse(row['plan_payload'])
      : row['plan_payload']) as TaxonomyMigrationPlan,
    status: String(row['status']) as TaxonomyMigrationRunStatus,
    completedItemIds: (Array.isArray(row['completed_item_ids']) ? row['completed_item_ids'] : []) as string[],
    nextCursor:
      typeof row['next_cursor'] === 'string'
        ? row['next_cursor']
        : typeof row['next_cursor'] === 'number'
          ? row['next_cursor'].toString()
          : null,
    expectedVersion: Number(row['expected_version']),
    lockVersion: Number(row['lock_version']),
    createdAt: new Date(row['created_at'] as string | Date).toISOString(),
    updatedAt: new Date(row['updated_at'] as string | Date).toISOString(),
    publishedAt: row['published_at'] ? new Date(row['published_at'] as string | Date).toISOString() : null,
  }
}

export class PostgresTaxonomyMigrationRepository implements TaxonomyMigrationRepository {
  async create(input: { readonly id: string; readonly plan: TaxonomyMigrationPlan; readonly now: string }): Promise<TaxonomyMigrationRun> {
    await db.table('taxonomy_migration_runs').insert({
      id: input.id,
      plan_token: input.plan.planToken,
      namespace: input.plan.namespace,
      from_version: input.plan.fromVersion,
      to_version: input.plan.toVersion,
      status: 'planned',
      plan_payload: JSON.stringify(input.plan),
      completed_item_ids: JSON.stringify([]),
      next_cursor: null,
      expected_version: input.plan.fromVersion,
      lock_version: 1,
      created_at: input.now,
      updated_at: input.now,
    })
    const row = (await db.from('taxonomy_migration_runs').where('id', input.id).first()) as
      | Record<string, unknown>
      | undefined
    if (!row) throw new InvariantViolationException('taxonomy_migration_run_create_failed')
    return toRun(row)
  }

  async findByPlanToken(planToken: string): Promise<TaxonomyMigrationRun | null> {
    const row = (await db.from('taxonomy_migration_runs').where('plan_token', planToken).first()) as
      | Record<string, unknown>
      | undefined
    return row ? toRun(row) : null
  }

  async checkpoint(input: {
    readonly planToken: string
    readonly expectedLockVersion: number
    readonly status: TaxonomyMigrationRunStatus
    readonly completedItemIds: readonly string[]
    readonly nextCursor: string | null
    readonly now: string
  }, transaction?: object): Promise<TaxonomyMigrationRun | null> {
    const query = clientFor(transaction)
      .from('taxonomy_migration_runs')
      .where('plan_token', input.planToken)
      .where('lock_version', input.expectedLockVersion)
    const updated = await query.update({
      status: input.status,
      completed_item_ids: JSON.stringify(input.completedItemIds),
      next_cursor: input.nextCursor,
      lock_version: input.expectedLockVersion + 1,
      updated_at: input.now,
      ...(input.status === 'completed' ? { published_at: input.now } : {}),
    })
    const updatedCount = typeof updated === 'number' ? updated : updated.length
    if (updatedCount !== 1) return null
    const row = (await clientFor(transaction)
      .from('taxonomy_migration_runs')
      .where('plan_token', input.planToken)
      .first()) as Record<string, unknown> | undefined
    return row ? toRun(row) : null
  }
}

export default PostgresTaxonomyMigrationRepository
