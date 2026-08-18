import type { TaxonomyMigrationPlan } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'

export type TaxonomyMigrationRunStatus = 'planned' | 'applying' | 'completed' | 'failed' | 'requires_repair'

export interface TaxonomyMigrationRun {
  readonly id: string
  readonly plan: TaxonomyMigrationPlan
  readonly status: TaxonomyMigrationRunStatus
  readonly completedItemIds: readonly string[]
  readonly nextCursor: string | null
  readonly expectedVersion: number
  readonly lockVersion: number
  readonly createdAt: string
  readonly updatedAt: string
  readonly publishedAt: string | null
}

export interface TaxonomyMigrationRepository {
  create(input: { readonly id: string; readonly plan: TaxonomyMigrationPlan; readonly now: string }): Promise<TaxonomyMigrationRun>
  findByPlanToken(planToken: string): Promise<TaxonomyMigrationRun | null>
  checkpoint(input: { readonly planToken: string; readonly expectedLockVersion: number; readonly status: TaxonomyMigrationRunStatus; readonly completedItemIds: readonly string[]; readonly nextCursor: string | null; readonly now: string }, transaction?: object): Promise<TaxonomyMigrationRun | null>
}
