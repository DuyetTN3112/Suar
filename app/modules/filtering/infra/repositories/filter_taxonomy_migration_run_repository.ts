import db from '@adonisjs/lucid/services/db'

import type { FilterTaxonomyMigrationRunPort, FilterTaxonomyMigrationRun } from '#modules/filtering/actions/ports/outbound/filter_taxonomy_migration_run_port'
import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type { TaxonomyMigrationPlan } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'

type DbClient = typeof db
type Row = Record<string, unknown>

function clientFor(transaction?: FilterTransaction): DbClient {
  return (transaction ?? db) as DbClient
}

function parsePlan(value: unknown): TaxonomyMigrationPlan {
  return (typeof value === 'string' ? JSON.parse(value) : value) as TaxonomyMigrationPlan
}

function cursor(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return null
}

function completedItemIds(value: unknown): string[] {
  const parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
}

function scanPass(value: unknown): FilterTaxonomyMigrationRun['scanPass'] {
  return value === 'final_rescan' ? 'final_rescan' : 'initial'
}

export class PostgresFilterTaxonomyMigrationRunRepository implements FilterTaxonomyMigrationRunPort {
  async findByPlanToken(planToken: string, transaction?: FilterTransaction): Promise<FilterTaxonomyMigrationRun | null> {
    const client = clientFor(transaction)
    const parentQuery = client.from('taxonomy_migration_runs').where('plan_token', planToken)
    if (transaction) await parentQuery.forUpdate()
    const parent = (await parentQuery.first()) as Row | undefined
    if (!parent) return null

    const childQuery = client.from('filter_taxonomy_migration_runs').where('plan_token', planToken)
    if (transaction) await childQuery.forUpdate()
    const child = (await childQuery.first()) as Row | undefined
    return {
      plan: parsePlan(parent.plan_payload),
      status: (child?.status === 'completed' || child?.status === 'requires_repair' ? child.status : 'applying'),
      scanPass: scanPass(child?.scan_pass),
      completedItemIds: completedItemIds(child?.completed_item_ids),
      nextCursor: cursor(child?.next_cursor),
      lockVersion: child ? Number(child.lock_version) : 1,
    }
  }

  async checkpoint(
    input: Parameters<FilterTaxonomyMigrationRunPort['checkpoint']>[0],
    transaction?: FilterTransaction
  ): Promise<FilterTaxonomyMigrationRun | null> {
    const client = clientFor(transaction)
    const parentQuery = client.from('taxonomy_migration_runs').where('plan_token', input.planToken)
    if (transaction) await parentQuery.forUpdate()
    const parent = (await parentQuery.first()) as Row | undefined
    if (!parent) return null

    const childQuery = client.from('filter_taxonomy_migration_runs').where('plan_token', input.planToken)
    if (transaction) await childQuery.forUpdate()
    const existing = (await childQuery.first()) as Row | undefined
    const nextLockVersion = input.expectedLockVersion + 1
    const completedAt = input.status === 'completed' ? input.now : null

    if (!existing) {
      if (input.expectedLockVersion !== 1) return null
      await client.table('filter_taxonomy_migration_runs').insert({
        plan_token: input.planToken,
        status: input.status,
        scan_pass: input.scanPass,
        completed_item_ids: JSON.stringify(input.completedItemIds),
        next_cursor: input.nextCursor,
        lock_version: nextLockVersion,
        diagnostic_code: input.status === 'requires_repair' ? 'taxonomy_requires_repair' : null,
        created_at: input.now,
        updated_at: input.now,
        completed_at: completedAt,
      })
    } else {
      const updated = await client
        .from('filter_taxonomy_migration_runs')
        .where('plan_token', input.planToken)
        .where('lock_version', input.expectedLockVersion)
        .update({
          status: input.status,
          scan_pass: input.scanPass,
          completed_item_ids: JSON.stringify(input.completedItemIds),
          next_cursor: input.nextCursor,
          lock_version: nextLockVersion,
          diagnostic_code: input.status === 'requires_repair' ? 'taxonomy_requires_repair' : null,
          updated_at: input.now,
          completed_at: completedAt,
        })
      const updatedCount = typeof updated === 'number' ? updated : updated.length
      if (updatedCount !== 1) return null
    }

    const child = (await client.from('filter_taxonomy_migration_runs').where('plan_token', input.planToken).first()) as Row | undefined
    if (!child) return null
    return {
      plan: parsePlan(parent.plan_payload),
      status: child.status as FilterTaxonomyMigrationRun['status'],
      scanPass: scanPass(child.scan_pass),
      completedItemIds: completedItemIds(child.completed_item_ids),
      nextCursor: cursor(child.next_cursor),
      lockVersion: Number(child.lock_version),
    }
  }
}

export default PostgresFilterTaxonomyMigrationRunRepository
