import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type { TaxonomyMigrationPlan } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_migration_plan'

export interface FilterTaxonomyMigrationRun {
  readonly plan: TaxonomyMigrationPlan
  readonly status: 'applying' | 'completed' | 'requires_repair'
  readonly scanPass: 'initial' | 'final_rescan'
  readonly completedItemIds: readonly string[]
  readonly nextCursor?: string | null
  readonly lockVersion: number
}

export interface FilterTaxonomyMigrationRunPort {
  findByPlanToken(planToken: string, transaction?: FilterTransaction): Promise<FilterTaxonomyMigrationRun | null>
  checkpoint(input: {
    readonly planToken: string
    readonly expectedLockVersion: number
    readonly status: 'applying' | 'completed' | 'requires_repair'
    readonly scanPass: 'initial' | 'final_rescan'
    readonly completedItemIds: readonly string[]
    readonly nextCursor: string | null
    readonly now: string
  }, transaction?: FilterTransaction): Promise<FilterTaxonomyMigrationRun | null>
}
