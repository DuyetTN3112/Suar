import type { TaxonomyMigrationRun } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_migration_repository'

export type TaxonomyConsumerCoordinationStatus = 'applying' | 'completed' | 'requires_repair'

export interface TaxonomyConsumerCoordinator {
  coordinate(input: {
    readonly run: TaxonomyMigrationRun
    readonly limit: number
    readonly now: string
  }): Promise<{
    readonly status: TaxonomyConsumerCoordinationStatus
    readonly nextCursor: string | null
    readonly lockVersion: number
  }>
}
