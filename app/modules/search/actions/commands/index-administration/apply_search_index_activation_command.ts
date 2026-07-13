import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { BaseCommand } from '#modules/search/actions/base_command'
import type { SearchIndexPlanTokenGenerator } from '#modules/search/actions/ports/outbound/search_index_administration_port'
import type { SearchIndexCutoverFaultEvent, SearchIndexCutoverFaultHook } from '#modules/search/actions/ports/outbound/search_index_cutover_fault_hook'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import { searchIndexActivationStateToken } from '#modules/search/actions/queries/index-administration/preview_search_index_activation_query'
import { advanceSearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'

interface SearchGenerationRoutingPort {
  getBackingIndices(): Promise<readonly string[]>
  activateGeneration(indexName: string, expectedCurrentIndexNames?: readonly string[]): Promise<void>
}

export interface ApplySearchIndexActivationInput {
  readonly id: string
  readonly expectedLockVersion: number
  readonly expectedCurrentIndexNames?: readonly string[]
  readonly expectedStateToken: string
  readonly now: string
}

export class ApplySearchIndexActivationCommand extends BaseCommand<
  ApplySearchIndexActivationInput,
  ReturnType<typeof advanceSearchProjectionGeneration>
> {
  constructor(
    private readonly generations: SearchProjectionGenerationRepository,
    private readonly routing: SearchGenerationRoutingPort,
    private readonly tokenGenerator: SearchIndexPlanTokenGenerator,
    private readonly faultHook?: SearchIndexCutoverFaultHook
  ) {
    super()
  }

  async handle(input: ApplySearchIndexActivationInput) {
    const initialGeneration = await this.generations.findById(input.id)
    if (initialGeneration === null) throw new InvariantViolationException('search_projection_generation_missing')

    return this.generations.withTargetLock(initialGeneration.target, async (lockedGenerations) => {
      const generation = await lockedGenerations.findById(input.id)
      const records = await lockedGenerations.listByTarget(initialGeneration.target)
      if (generation === null) throw new InvariantViolationException('search_projection_generation_missing')
      if (generation.status !== 'ready') throw new InvariantViolationException('search projection generation is not ready')

      const activeRecords = records.filter(({ generation: candidate }) => candidate.status === 'active')
      if (activeRecords.length > 1) {
        throw new InvariantViolationException('search_projection_reconcile_active_generation_count')
      }
      const activeRecord = activeRecords[0]
      const activeIndexNames = await this.routing.getBackingIndices()
      const expectedStateToken = searchIndexActivationStateToken(
        generation,
        activeIndexNames,
        this.tokenGenerator
      )
      if (expectedStateToken !== input.expectedStateToken) {
        throw new ConflictException('search_projection_activation_preview_stale')
      }
      if (
        input.expectedCurrentIndexNames !== undefined &&
        JSON.stringify([...input.expectedCurrentIndexNames]) !== JSON.stringify([...activeIndexNames])
      ) {
        throw new ConflictException('search_projection_activation_alias_state_stale')
      }

      await this.routing.activateGeneration(generation.physicalIndexName, input.expectedCurrentIndexNames)
      await this.faultHook?.({
        point: 'after_alias_swap',
        operation: 'activation',
        target: generation.target,
        generationId: generation.id,
        physicalIndexName: generation.physicalIndexName,
      })

      if (activeRecord && activeRecord.generation.id !== generation.id) {
        const repaired = advanceSearchProjectionGeneration(activeRecord.generation, 'requires_repair', input.now)
        const demoted = await lockedGenerations.transition({
          id: activeRecord.generation.id,
          expectedLockVersion: activeRecord.lockVersion,
          status: repaired.status,
          sourceEntityRevision: repaired.sourceEntityRevision,
          checkpoint: repaired.checkpoint,
          documentCount: repaired.documentCount,
          completenessChecksum: repaired.completenessChecksum,
          updatedAt: repaired.updatedAt,
        })
        if (demoted === null) {
          throw new ConflictException('search_projection_generation_lock_conflict_after_activation')
        }
        await this.notifyLedgerTransition(activeRecord.generation, repaired.status, demoted.lockVersion)
      }

      const next = advanceSearchProjectionGeneration(generation, 'active', input.now)
      const updated = await lockedGenerations.transition({
        id: generation.id,
        expectedLockVersion: input.expectedLockVersion,
        status: next.status,
        sourceEntityRevision: next.sourceEntityRevision,
        checkpoint: next.checkpoint,
        documentCount: next.documentCount,
        completenessChecksum: next.completenessChecksum,
        updatedAt: next.updatedAt,
      })
      if (updated === null) {
        const repair = advanceSearchProjectionGeneration(generation, 'requires_repair', input.now)
        await lockedGenerations.transition({
          id: generation.id,
          expectedLockVersion: input.expectedLockVersion,
          status: repair.status,
          sourceEntityRevision: repair.sourceEntityRevision,
          checkpoint: repair.checkpoint,
          documentCount: repair.documentCount,
          completenessChecksum: repair.completenessChecksum,
          updatedAt: repair.updatedAt,
        })
        throw new ConflictException('search_projection_generation_lock_conflict_after_activation')
      }
      await this.notifyLedgerTransition(generation, next.status, updated.lockVersion)
      return updated.generation
    })
  }

  private notifyLedgerTransition(
    previous: ReturnType<typeof advanceSearchProjectionGeneration>,
    toStatus: ReturnType<typeof advanceSearchProjectionGeneration>['status'],
    lockVersion: number
  ): Promise<void> {
    const event: SearchIndexCutoverFaultEvent = {
      point: 'after_ledger_transition',
      operation: 'activation',
      target: previous.target,
      generationId: previous.id,
      physicalIndexName: previous.physicalIndexName,
      fromStatus: previous.status,
      toStatus,
      lockVersion,
    }
    return Promise.resolve(this.faultHook?.(event))
  }

  execute(input: ApplySearchIndexActivationInput) {
    return this.handle(input)
  }
}
