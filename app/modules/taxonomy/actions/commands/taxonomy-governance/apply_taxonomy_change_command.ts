import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { BaseCommand } from '#modules/taxonomy/actions/base_command'
import type { TaxonomyMigrationRepository, TaxonomyMigrationRun } from '#modules/taxonomy/actions/ports/outbound/taxonomy-governance/taxonomy_migration_repository'
import { applyTaxonomyMigrationPlan, type TaxonomyMigrationCheckpoint, type TaxonomyMigrationItem } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_change_set'

export class ApplyTaxonomyChangeCommand extends BaseCommand {
  constructor(private readonly repository: TaxonomyMigrationRepository) {
    super()
  }

  async handle(input: {
    readonly planToken: string
    readonly expectedLockVersion: number
    readonly currentVersion: number
    readonly publishedVersion: number
    readonly items: readonly TaxonomyMigrationItem[]
    readonly limit: number
    readonly now: string
  }): Promise<{ readonly run: TaxonomyMigrationRun; readonly checkpoint: TaxonomyMigrationCheckpoint }> {
    const run = await this.repository.findByPlanToken(input.planToken)
    if (run === null || run.lockVersion !== input.expectedLockVersion) throw new ConflictException('stale_taxonomy_migration_plan')
    const checkpoint = applyTaxonomyMigrationPlan({
      planToken: input.planToken,
      expectedVersion: run.expectedVersion,
      currentVersion: input.currentVersion,
      publishedVersion: input.publishedVersion,
      items: input.items,
      completedIds: run.completedItemIds,
      limit: input.limit,
    })
    const updated = await this.repository.checkpoint({
      planToken: input.planToken,
      expectedLockVersion: input.expectedLockVersion,
      status: checkpoint.nextCursor === null ? 'completed' : 'applying',
      completedItemIds: checkpoint.completedIds,
      nextCursor: checkpoint.nextCursor,
      now: input.now,
    })
    if (updated === null) throw new ConflictException('stale_taxonomy_migration_plan')
    return { run: updated, checkpoint }
  }
}
