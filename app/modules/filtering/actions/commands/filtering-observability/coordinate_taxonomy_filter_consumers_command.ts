import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { BaseCommand } from '#modules/filtering/actions/base_command'
import type { FilterAlertPausePort } from '#modules/filtering/actions/ports/outbound/filter_alert_pause_port'
import {
  FilterSavedViewRepositoryError,
  type FilterSavedViewRepository,
} from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type { FilterTaxonomyMigrationRunPort } from '#modules/filtering/actions/ports/outbound/filter_taxonomy_migration_run_port'
import type { FilterTransactionRunner } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type { FilterSavedViewMigrationRunRepository } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_migration_run_repository'
import type { FilterSavedViewTaxonomyReferenceRepository } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_taxonomy_references'
import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'
import { migrateTaxonomyFilterSemanticState } from '#modules/filtering/domain/filtering-core/taxonomy_filter_criteria_migration'
import { hashSavedFilterSemanticState, createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import type { TaxonomyCriteriaMapping } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_change_criteria_mapping'

export interface CoordinateTaxonomyFilterConsumersInput {
  readonly planToken: string
  readonly limit: number
  readonly now: string
}

export class CoordinateTaxonomyFilterConsumersCommand extends BaseCommand<
  CoordinateTaxonomyFilterConsumersInput,
  Awaited<ReturnType<FilterTaxonomyMigrationRunPort['checkpoint']>>
> {
  constructor(
    private readonly views: FilterSavedViewRepository,
    private readonly references: FilterSavedViewTaxonomyReferenceRepository,
    private readonly migrationRuns: FilterSavedViewMigrationRunRepository,
    private readonly transactions: FilterTransactionRunner,
    private readonly alerts: FilterAlertPausePort,
    private readonly runs: FilterTaxonomyMigrationRunPort,
    private readonly hashGenerator: FilterHashGenerator
  ) {
    super()
  }

  async handle(input: CoordinateTaxonomyFilterConsumersInput) {
    return this.transactions.run(async (transaction) => {
      const run = await this.runs.findByPlanToken(input.planToken, transaction)
      if (run === null) throw new ConflictException('stale_taxonomy_migration_plan')
      if (run.status === 'completed') return run

      const completed = new Set(run.completedItemIds)
      const finalRescan = run.scanPass === 'final_rescan' || run.status === 'requires_repair'
      const mappings = run.plan.mapping as readonly TaxonomyCriteriaMapping[]
      const termIds = mappings
        .filter((mapping) => mapping.from.namespace === run.plan.namespace)
        .map((mapping) => mapping.from.termId)
      const pageLimit = Math.max(1, Math.min(input.limit, 100))
      let requiresRepair = false
      let recordedWork = false

      const candidates = await this.references.listByTaxonomyReferences({
        namespace: run.plan.namespace,
        termIds,
        afterViewId: run.nextCursor ?? null,
        limit: pageLimit,
      }, transaction)
      if (!finalRescan && candidates.viewIds.length === 0 && candidates.nextCursor === null && run.nextCursor === null && run.plan.impact.savedViews > 0) {
        requiresRepair = true
      }

      for (const viewId of candidates.viewIds) {
        if (!finalRescan && completed.has(viewId)) continue
        const record = await this.views.findById(viewId, transaction, { lock: 'for_update' })
        if (record === null) {
          completed.add(viewId)
          continue
        }

        const currentView = coordinationView(record.view)
        const existingReceipt = await this.migrationRuns.findByIdempotency({
          savedViewId: viewId,
          migrationId: input.planToken,
          inputChecksum: currentView.semanticChecksum,
        }, transaction)
        if (existingReceipt && existingReceipt.outcome !== 'pending') {
          completed.add(viewId)
          requiresRepair ||= existingReceipt.outcome === 'requires_repair' || existingReceipt.outcome === 'blocked'
          continue
        }

        const result = migrateTaxonomyFilterSemanticState(currentView.semanticState, mappings) as {
          readonly semanticState: Record<string, unknown>
          readonly changed: boolean
          readonly outcome: 'compatible' | 'migrated' | 'requires_repair' | 'blocked'
        }
        const isRepair = result.outcome === 'requires_repair' || result.outcome === 'blocked'
        requiresRepair ||= isRepair

        if (isRepair) {
          await this.alerts.pauseForSavedView({
            savedViewId: viewId,
            reason: `taxonomy_${result.outcome}`,
            now: input.now,
            transaction,
          })
          const updated = await this.views.update({
            record: {
              ...record,
              migrationState: result.outcome === 'blocked' ? 'blocked' : 'requires_repair',
            },
            expectedLockVersion: record.lockVersion,
          }, transaction)
          if (updated === null) throw new FilterSavedViewRepositoryError('OPTIMISTIC_CONFLICT')
        } else if (result.changed) {
          const view = createSavedFilterView(
            { ...currentView, semanticState: result.semanticState, updatedAt: input.now },
            {},
            this.hashGenerator
          ) as unknown as CoordinationView
          const updated = await this.views.update({
            record: { ...record, view, migrationState: 'current' },
            expectedLockVersion: record.lockVersion,
          }, transaction)
          if (updated === null) throw new FilterSavedViewRepositoryError('OPTIMISTIC_CONFLICT')
        }

        const outputChecksum: string | null = result.changed
          ? hashSavedFilterSemanticState(result.semanticState, this.hashGenerator) as string
          : isRepair
            ? null
          : currentView.semanticChecksum
        await this.migrationRuns.record({
          savedViewId: viewId,
          migrationId: input.planToken,
          fromVersion: run.plan.fromVersion,
          toVersion: run.plan.toVersion,
          inputChecksum: currentView.semanticChecksum,
          outputChecksum,
          outcome: result.outcome,
          atomicPayload: result.changed ? { semanticState: result.semanticState } : null,
          diagnosticCode: isRepair ? `taxonomy_${result.outcome}` : null,
          now: input.now,
        }, transaction)
        recordedWork = true
        completed.add(viewId)
      }

      const nextCursor = candidates.nextCursor
      const nextScanPass = finalRescan ? 'final_rescan' as const : nextCursor === null ? 'final_rescan' as const : 'initial' as const
      const nextStatus = requiresRepair
        ? 'requires_repair' as const
        : nextCursor !== null || !finalRescan || recordedWork
          ? 'applying' as const
          : 'completed' as const
      const checkpoint = await this.runs.checkpoint({
        planToken: input.planToken,
        expectedLockVersion: run.lockVersion,
        status: nextStatus,
        scanPass: nextScanPass,
        completedItemIds: [...completed],
        nextCursor,
        now: input.now,
      }, transaction)
      if (checkpoint === null) throw new ConflictException('stale_taxonomy_migration_plan')
      return checkpoint
    })
  }
}

interface CoordinationView {
  readonly id: string
  readonly semanticChecksum: string
  readonly semanticState: Record<string, unknown>
  readonly [key: string]: unknown
}

function coordinationView(value: unknown): CoordinationView {
  if (value === null || typeof value !== 'object') {
    throw new FilterSavedViewRepositoryError('CORRUPTED_PAYLOAD')
  }
  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string' || typeof candidate.semanticChecksum !== 'string') {
    throw new FilterSavedViewRepositoryError('CORRUPTED_PAYLOAD')
  }
  return candidate as CoordinationView
}
