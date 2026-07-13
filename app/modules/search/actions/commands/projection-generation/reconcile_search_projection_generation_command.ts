import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { BaseCommand } from '#modules/search/actions/base_command'
import type { SearchIndexCutoverFaultEvent, SearchIndexCutoverFaultHook } from '#modules/search/actions/ports/outbound/search_index_cutover_fault_hook'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import { advanceSearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'

interface SearchProjectionRoutingReconciler {
  readonly aliasName: string
  getBackingIndices(): Promise<string[]>
  reconcileAliasToGeneration(physicalIndexName: string, expectedCurrentIndexNames: readonly string[]): Promise<void>
}

export interface ReconcileSearchProjectionGenerationInput {
  readonly target: string
}

export interface ReconcileSearchProjectionGenerationResult {
  readonly target: string
  readonly aliasName: string
  readonly generationId: string
  readonly physicalIndexName: string
  readonly changed: boolean
  readonly lockVersion: number
}

export class ReconcileSearchProjectionGenerationCommand extends BaseCommand<
  ReconcileSearchProjectionGenerationInput,
  ReconcileSearchProjectionGenerationResult
> {
  constructor(
    private readonly generations: SearchProjectionGenerationRepository,
    private readonly routing: SearchProjectionRoutingReconciler,
    private readonly faultHook?: SearchIndexCutoverFaultHook,
  ) {
    super()
  }

  async handle(input: ReconcileSearchProjectionGenerationInput): Promise<ReconcileSearchProjectionGenerationResult> {
    return this.generations.withTargetLock(input.target, async (lockedGenerations) => {
      const records = await lockedGenerations.listByTarget(input.target)
      const activeRecords = records.filter(({ generation }) => generation.status === 'active')
      if (activeRecords.length !== 1) {
        throw new InvariantViolationException('search_projection_reconcile_active_generation_count')
      }

      const activeRecord = activeRecords[0]
      if (!activeRecord) throw new InvariantViolationException('search_projection_reconcile_active_generation_count')
      const generation: SearchProjectionGeneration = activeRecord.generation
      const currentIndexNames = await this.routing.getBackingIndices()
      const alreadyRouted = currentIndexNames.length === 1 && currentIndexNames[0] === generation.physicalIndexName
      if (!alreadyRouted) {
        const aliasGeneration = records.find(
          ({ generation: candidate }) =>
            currentIndexNames.length === 1 && candidate.physicalIndexName === currentIndexNames[0]
        )
        if (
          aliasGeneration &&
          aliasGeneration.generation.status === 'ready' &&
          aliasGeneration.generation.id !== generation.id
        ) {
          const now = new Date().toISOString()
          const repairedActive = advanceSearchProjectionGeneration(
            generation,
            'requires_repair',
            now
          )
          const demoted = await lockedGenerations.transition({
            id: generation.id,
            expectedLockVersion: activeRecord.lockVersion,
            status: repairedActive.status,
            sourceEntityRevision: repairedActive.sourceEntityRevision,
            checkpoint: repairedActive.checkpoint,
            documentCount: repairedActive.documentCount,
            completenessChecksum: repairedActive.completenessChecksum,
            updatedAt: repairedActive.updatedAt,
          })
          if (demoted === null) {
            throw new InvariantViolationException('search_projection_reconcile_active_generation_stale')
          }
          await this.notifyLedgerTransition(generation, repairedActive.status, demoted.lockVersion)

          const adopted = advanceSearchProjectionGeneration(
            aliasGeneration.generation,
            'active',
            now
          )
          const promoted = await lockedGenerations.transition({
            id: adopted.id,
            expectedLockVersion: aliasGeneration.lockVersion,
            status: adopted.status,
            sourceEntityRevision: adopted.sourceEntityRevision,
            checkpoint: adopted.checkpoint,
            documentCount: adopted.documentCount,
            completenessChecksum: adopted.completenessChecksum,
            updatedAt: adopted.updatedAt,
          })
          if (promoted === null) {
            throw new InvariantViolationException('search_projection_reconcile_alias_generation_stale')
          }
          await this.notifyLedgerTransition(aliasGeneration.generation, adopted.status, promoted.lockVersion)

          return {
            target: input.target,
            aliasName: this.routing.aliasName,
            generationId: promoted.generation.id,
            physicalIndexName: promoted.generation.physicalIndexName,
            changed: true,
            lockVersion: promoted.lockVersion,
          }
        }

        await this.routing.reconcileAliasToGeneration(generation.physicalIndexName, currentIndexNames)
        await this.faultHook?.({
          point: 'after_alias_swap',
          operation: 'reconcile',
          target: input.target,
          generationId: generation.id,
          physicalIndexName: generation.physicalIndexName,
        })
      }

      return {
        target: input.target,
        aliasName: this.routing.aliasName,
        generationId: generation.id,
        physicalIndexName: generation.physicalIndexName,
        changed: !alreadyRouted,
        lockVersion: activeRecord.lockVersion,
      }
    })
  }

  private notifyLedgerTransition(
    previous: SearchProjectionGeneration,
    toStatus: SearchProjectionGeneration['status'],
    lockVersion: number
  ): Promise<void> {
    const event: SearchIndexCutoverFaultEvent = {
      point: 'after_ledger_transition',
      operation: 'reconcile',
      target: previous.target,
      generationId: previous.id,
      physicalIndexName: previous.physicalIndexName,
      fromStatus: previous.status,
      toStatus,
      lockVersion,
    }
    return Promise.resolve(this.faultHook?.(event))
  }
}
