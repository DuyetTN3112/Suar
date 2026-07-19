import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { BaseCommand } from '#modules/search/actions/base_command'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import { advanceSearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'

interface SearchGenerationActivationPort {
  activateGeneration(indexName: string, expectedCurrentIndexNames?: readonly string[]): Promise<void>
}

export interface ActivateSearchProjectionGenerationInput {
  readonly id: string
  readonly expectedLockVersion: number
  readonly expectedCurrentIndexNames?: readonly string[]
  readonly now: string
}

export class ActivateSearchProjectionGenerationCommand extends BaseCommand<
  ActivateSearchProjectionGenerationInput,
  ReturnType<typeof advanceSearchProjectionGeneration>
> {
  constructor(
    private readonly generations: SearchProjectionGenerationRepository,
    private readonly lifecycle: SearchGenerationActivationPort,
  ) {
    super()
  }

  async handle(input: ActivateSearchProjectionGenerationInput) {
    const generation = await this.generations.findById(input.id)
    if (generation === null || generation.status !== 'ready') throw new InvariantViolationException('search_projection_generation_not_ready')
    await this.lifecycle.activateGeneration(generation.physicalIndexName, input.expectedCurrentIndexNames === undefined ? undefined : [...input.expectedCurrentIndexNames])
    const next = advanceSearchProjectionGeneration(generation, 'active', input.now)
    const updated = await this.generations.transition({
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
      await this.generations.transition({
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
    return updated.generation
  }
}
